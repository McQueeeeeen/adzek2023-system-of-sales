"use client";

import { useMemo, useState } from "react";
import { Copy, MessageCircle, RefreshCcw, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { buildWhatsappLink } from "@/lib/whatsapp-templates";
import {
  AiWhatsappGenerationOptions,
  AiWhatsappMessageVariant,
  AI_WHATSAPP_GOAL_LABELS,
  AI_WHATSAPP_GOALS,
  AI_WHATSAPP_LENGTH_LABELS,
  AI_WHATSAPP_LENGTHS,
  AI_WHATSAPP_PRESSURE_LABELS,
  AI_WHATSAPP_PRESSURES,
  AI_WHATSAPP_TONE_LABELS,
  AI_WHATSAPP_TONES,
} from "@/lib/ai/whatsapp-message";
import { Client } from "@/types/client";

type Props = {
  client: Client;
  defaultOptions: AiWhatsappGenerationOptions;
};

export function AiWhatsappMessageEngine({ client, defaultOptions }: Props) {
  const [options, setOptions] = useState<AiWhatsappGenerationOptions>(defaultOptions);
  const [messages, setMessages] = useState<AiWhatsappMessageVariant[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const hasMessages = messages.length > 0;
  const buttonLabel = hasMessages ? "Сгенерировать заново" : "Сгенерировать сообщение";

  const hintText = useMemo(() => {
    return "AI учитывает статус клиента, следующее действие, историю касаний и приоритет лида.";
  }, []);

  async function handleGenerate() {
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/ai/generate-whatsapp-message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId: client.id,
          options,
        }),
      });

      const payload = (await response.json().catch(() => null)) as
        | { ok?: boolean; error?: string; messages?: AiWhatsappMessageVariant[] }
        | null;

      if (!response.ok || !payload?.ok || !Array.isArray(payload.messages)) {
        throw new Error(payload?.error || "Не удалось сгенерировать сообщения.");
      }

      setMessages(payload.messages);
    } catch (generationError) {
      setError(
        generationError instanceof Error
          ? generationError.message
          : "Ошибка генерации AI-сообщения."
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleCopy(text: string, index: number) {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 1500);
    } catch {
      setError("Не удалось скопировать текст в буфер обмена.");
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="section-title">AI-сообщение</CardTitle>
        <p className="section-subtitle">{hintText}</p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <div className="space-y-2">
            <p className="field-label">Цель</p>
            <Select
              value={options.goal}
              onChange={(e) =>
                setOptions((prev) => ({
                  ...prev,
                  goal: e.target.value as AiWhatsappGenerationOptions["goal"],
                }))
              }
            >
              {AI_WHATSAPP_GOALS.map((goal) => (
                <option key={goal} value={goal}>
                  {AI_WHATSAPP_GOAL_LABELS[goal]}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-2">
            <p className="field-label">Тон</p>
            <Select
              value={options.tone}
              onChange={(e) =>
                setOptions((prev) => ({
                  ...prev,
                  tone: e.target.value as AiWhatsappGenerationOptions["tone"],
                }))
              }
            >
              {AI_WHATSAPP_TONES.map((tone) => (
                <option key={tone} value={tone}>
                  {AI_WHATSAPP_TONE_LABELS[tone]}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-2">
            <p className="field-label">Давление</p>
            <Select
              value={options.pressure}
              onChange={(e) =>
                setOptions((prev) => ({
                  ...prev,
                  pressure: e.target.value as AiWhatsappGenerationOptions["pressure"],
                }))
              }
            >
              {AI_WHATSAPP_PRESSURES.map((pressure) => (
                <option key={pressure} value={pressure}>
                  {AI_WHATSAPP_PRESSURE_LABELS[pressure]}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-2">
            <p className="field-label">Длина</p>
            <Select
              value={options.length}
              onChange={(e) =>
                setOptions((prev) => ({
                  ...prev,
                  length: e.target.value as AiWhatsappGenerationOptions["length"],
                }))
              }
            >
              {AI_WHATSAPP_LENGTHS.map((length) => (
                <option key={length} value={length}>
                  {AI_WHATSAPP_LENGTH_LABELS[length]}
                </option>
              ))}
            </Select>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button onClick={handleGenerate} disabled={loading}>
            <Sparkles className="mr-1.5 h-4 w-4" />
            {loading ? "Генерация..." : buttonLabel}
          </Button>
          {hasMessages ? (
            <Button variant="outline" onClick={handleGenerate} disabled={loading}>
              <RefreshCcw className="mr-1.5 h-4 w-4" />
              Сгенерировать заново
            </Button>
          ) : null}
        </div>

        {error ? (
          <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
            {error}
          </p>
        ) : null}

        {!hasMessages && !loading ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50/70 p-4">
            <p className="text-sm font-medium text-slate-800">AI-варианты пока не сгенерированы</p>
            <p className="mt-1 text-sm text-slate-600">
              Выберите цель и тон, затем нажмите «Сгенерировать сообщение».
            </p>
          </div>
        ) : null}

        {hasMessages ? (
          <div className="grid gap-3 xl:grid-cols-3">
            {messages.map((message, index) => (
              <div
                key={`${message.label}-${index}`}
                className="rounded-xl border border-slate-200 bg-white p-4"
              >
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  {message.label}
                </p>
                <p className="mt-2 whitespace-pre-line text-sm leading-6 text-slate-900">
                  {message.text}
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => void handleCopy(message.text, index)}
                  >
                    <Copy className="mr-1.5 h-4 w-4" />
                    {copiedIndex === index ? "Скопировано" : "Копировать"}
                  </Button>
                  <Button asChild size="sm">
                    <a
                      href={buildWhatsappLink(client.whatsappNumber, message.text)}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <MessageCircle className="mr-1.5 h-4 w-4" />
                      Открыть в WhatsApp
                    </a>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
