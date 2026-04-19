import { NextRequest, NextResponse } from "next/server";
import { mapDbActivityToClientEvent, mapDbClientToClient, type DbActivityRow, type DbClientRow } from "@/lib/crm-mappers";
import { formatCurrency, formatDate, STATUS_LABELS } from "@/lib/format";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  AiWhatsappGenerationResponse,
  AiWhatsappGenerationOptions,
  AI_WHATSAPP_GOAL_LABELS,
  AI_WHATSAPP_LENGTH_LABELS,
  AI_WHATSAPP_PRESSURE_LABELS,
  AI_WHATSAPP_TONE_LABELS,
  isValidAiOptions,
} from "@/lib/ai/whatsapp-message";

type Payload = {
  clientId?: string;
  options?: AiWhatsappGenerationOptions;
};

function sanitizeMessageText(text: string) {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 4)
    .join("\n");
}

function buildHistorySummary(rows: DbActivityRow[]) {
  return rows
    .slice(0, 8)
    .map((row) => {
      const event = mapDbActivityToClientEvent(row);
      const dateLabel = formatDate(event.date);
      const result = event.description?.trim();
      return result
        ? `${dateLabel}: ${event.title} — ${result}`
        : `${dateLabel}: ${event.title}`;
    })
    .join("\n");
}

function getContextFlags(client: ReturnType<typeof mapDbClientToClient>) {
  const now = new Date();
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const followDate = new Date(client.followUpDate);
  const lastContactDate = new Date(client.lastContactAt);
  const overdue = followDate < startToday;
  const daysWithoutReply = Math.max(
    0,
    Math.floor((startToday.getTime() - lastContactDate.getTime()) / 86_400_000)
  );
  const silent = daysWithoutReply >= 4;

  return {
    overdue,
    daysWithoutReply,
    sampleReceived: client.status === "sample" || client.status === "waiting-test",
    inNegotiation: client.status === "negotiating",
    silent,
  };
}

function buildPrompt(
  client: ReturnType<typeof mapDbClientToClient>,
  options: AiWhatsappGenerationOptions,
  historySummary: string
) {
  const flags = getContextFlags(client);

  return `
Контекст лида:
- Клиент: ${client.name}
- Компания: ${client.companyName}
- Статус: ${STATUS_LABELS[client.status]}
- Приоритет: ${client.priority}
- Потенциал: ${formatCurrency(client.estimatedMonthlyValue)}
- Следующее действие: ${client.nextAction || "не задано"}
- Следующее касание: ${formatDate(client.followUpDate)}
- Последний контакт: ${formatDate(client.lastContactAt)}
- Продукт: ${client.product || "не указан"}
- Сегмент: ${client.segment || "не указан"}
- Комментарии: ${client.notes || "нет"}

Флаги:
- Просрочено: ${flags.overdue ? "да" : "нет"}
- Дней без контакта: ${flags.daysWithoutReply}
- Этап пробника/теста: ${flags.sampleReceived ? "да" : "нет"}
- Этап переговоров: ${flags.inNegotiation ? "да" : "нет"}
- Клиент молчит: ${flags.silent ? "да" : "нет"}

История (последние касания):
${historySummary || "история пуста"}

Настройки генерации:
- Цель: ${AI_WHATSAPP_GOAL_LABELS[options.goal]}
- Тон: ${AI_WHATSAPP_TONE_LABELS[options.tone]}
- Давление: ${AI_WHATSAPP_PRESSURE_LABELS[options.pressure]}
- Длина: ${AI_WHATSAPP_LENGTH_LABELS[options.length]}

Сформируй 3 варианта WhatsApp-сообщения для этого клиента.
`.trim();
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => ({}))) as Payload;
    const clientId = body.clientId?.trim();
    const options = body.options;

    if (!clientId || !isValidAiOptions(options)) {
      return NextResponse.json(
        { ok: false, error: "Некорректный запрос генерации." },
        { status: 400 }
      );
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { ok: false, error: "OPENAI_API_KEY не настроен на сервере." },
        { status: 500 }
      );
    }

    const supabase = createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const { data: clientRow, error: clientError } = await supabase
      .from("crm_clients")
      .select("*")
      .eq("id", clientId)
      .eq("owner_id", user.id)
      .single();

    if (clientError || !clientRow) {
      return NextResponse.json(
        { ok: false, error: "Клиент не найден или нет доступа." },
        { status: 404 }
      );
    }

    const { data: activityRows, error: activitiesError } = await supabase
      .from("crm_client_activities")
      .select("*")
      .eq("owner_id", user.id)
      .eq("client_id", clientId)
      .order("created_at", { ascending: false })
      .limit(20);

    if (activitiesError) {
      return NextResponse.json(
        { ok: false, error: "Не удалось загрузить историю клиента." },
        { status: 500 }
      );
    }

    const client = mapDbClientToClient(
      clientRow as DbClientRow,
      (activityRows ?? []) as DbActivityRow[]
    );
    const historySummary = buildHistorySummary((activityRows ?? []) as DbActivityRow[]);
    const userPrompt = buildPrompt(client, options, historySummary);

    const aiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || "gpt-4.1-mini",
        temperature: 0.7,
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "whatsapp_messages",
            strict: true,
            schema: {
              type: "object",
              properties: {
                messages: {
                  type: "array",
                  minItems: 2,
                  maxItems: 3,
                  items: {
                    type: "object",
                    properties: {
                      label: { type: "string" },
                      text: { type: "string" },
                    },
                    required: ["label", "text"],
                    additionalProperties: false,
                  },
                },
              },
              required: ["messages"],
              additionalProperties: false,
            },
          },
        },
        messages: [
          {
            role: "system",
            content:
              "Ты B2B sales assistant для внутренней CRM в Казахстане. Пиши только по-русски. Формат каждого сообщения: 2-4 короткие строки, без воды и бюрократии. Каждое сообщение должно завершаться вопросом или четким следующим шагом. Для просрочки повышай срочность. Для high priority/high potential повышай напор. Для этапа пробника фокус на результате теста. Для переговоров фокус на блокере/решении. Не используй эмодзи, не упоминай что ты ИИ.",
          },
          {
            role: "user",
            content: userPrompt,
          },
        ],
      }),
      cache: "no-store",
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      return NextResponse.json(
        { ok: false, error: `OpenAI error: ${aiResponse.status} ${errorText}` },
        { status: 500 }
      );
    }

    const completion = (await aiResponse.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };

    const rawContent = completion.choices?.[0]?.message?.content;
    if (!rawContent) {
      return NextResponse.json(
        { ok: false, error: "Пустой ответ от AI." },
        { status: 500 }
      );
    }

    let parsed: AiWhatsappGenerationResponse;
    try {
      parsed = JSON.parse(rawContent) as AiWhatsappGenerationResponse;
    } catch {
      return NextResponse.json(
        { ok: false, error: "Не удалось разобрать ответ AI." },
        { status: 500 }
      );
    }

    const normalizedMessages = (parsed.messages ?? [])
      .map((item) => ({
        label: item.label?.trim() || "Вариант",
        text: sanitizeMessageText(item.text || ""),
      }))
      .filter((item) => item.text.length > 0)
      .slice(0, 3);

    if (normalizedMessages.length < 2) {
      return NextResponse.json(
        { ok: false, error: "AI вернул недостаточно вариантов." },
        { status: 500 }
      );
    }

    await supabase.from("ai_message_generations").insert({
      owner_id: user.id,
      client_id: clientId,
      goal: options.goal,
      tone: options.tone,
      pressure: options.pressure,
      length: options.length,
      generated_text: normalizedMessages,
      was_used: false,
    });

    return NextResponse.json({ ok: true, messages: normalizedMessages });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
