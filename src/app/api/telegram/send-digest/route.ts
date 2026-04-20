import { NextRequest, NextResponse } from "next/server";
import { MOCK_CLIENTS } from "@/lib/mock-data";
import { mapDbClientToClient, type DbActivityRow, type DbClientRow } from "@/lib/crm-mappers";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { formatTelegramDigest, splitTelegramMessage, type WhatsappDigestItem } from "@/lib/telegram-digest";
import { Client } from "@/types/client";

type DbTemplateRow = {
  owner_id: string;
  category: string;
  title: string;
  body: string;
};

const KZ_TZ = process.env.KZ_TIMEZONE || "Asia/Almaty";

function todayKeyInTz(timeZone: string): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}

function daysSince(dateStr: string | null): number {
  if (!dateStr) return 0;
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 86_400_000);
}

function templateCategory(row: DbClientRow): string {
  const d = daysSince(row.sample_sent_date);
  if (d <= 3) return "first_followup";
  if (d <= 6) return "after_sample";
  if (d <= 9) return "overdue_followup";
  if (d <= 13) return "push";
  return "final_message";
}

function renderBody(body: string, row: DbClientRow): string {
  const vars: Record<string, string> = {
    client_name: row.name || "Клиент",
    company: row.company || "Компания",
    product: row.product || "",
    next_action: row.next_action || "",
  };
  return body.replace(/\[([a-z0-9_]+)\]/gi, (_, k: string) => vars[k.toLowerCase()] ?? `[${k}]`);
}

function buildWaUrl(phone: string, text: string): string {
  const digits = phone.replace(/\D/g, "");
  if (!digits) return "";
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
}

async function loadWhatsappItems(actionableRows: DbClientRow[]): Promise<WhatsappDigestItem[]> {
  if (!actionableRows.length) return [];

  const supabase = createSupabaseAdminClient();
  const ownerIds = Array.from(new Set(actionableRows.map((r) => r.owner_id)));

  const { data: templates } = await supabase
    .from("crm_whatsapp_templates")
    .select("owner_id, category, title, body")
    .in("owner_id", ownerIds)
    .eq("is_active", true);

  if (!templates?.length) return [];

  const tplMap = new Map<string, Map<string, DbTemplateRow>>();
  for (const t of templates as DbTemplateRow[]) {
    if (!tplMap.has(t.owner_id)) tplMap.set(t.owner_id, new Map());
    const byCategory = tplMap.get(t.owner_id)!;
    if (!byCategory.has(t.category)) byCategory.set(t.category, t);
  }

  const items: WhatsappDigestItem[] = [];
  for (const row of actionableRows) {
    if (!row.phone) continue;
    const tpl = tplMap.get(row.owner_id)?.get(templateCategory(row));
    if (!tpl) continue;
    const waUrl = buildWaUrl(row.phone, renderBody(tpl.body, row));
    if (!waUrl) continue;
    items.push({ name: row.name, companyName: row.company, templateTitle: tpl.title, waUrl });
  }

  return items;
}

async function hasAccess(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true;

  const authHeader = request.headers.get("authorization");
  const querySecret = request.nextUrl.searchParams.get("secret");

  if (authHeader === `Bearer ${secret}` || querySecret === secret) {
    return true;
  }

  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return Boolean(user);
}

async function sendTelegramMessage(token: string, chatId: string, text: string) {
  const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: "HTML",
      disable_web_page_preview: true,
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Telegram API error: ${response.status} ${errorText}`);
  }
}

async function sendDigest(clients: Client[], whatsappItems: WhatsappDigestItem[] = []) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!botToken || !chatId) {
    throw new Error("Missing TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID.");
  }

  const digest = formatTelegramDigest(clients, { whatsappItems });
  const chunks = splitTelegramMessage(digest.text);

  for (const chunk of chunks) {
    await sendTelegramMessage(botToken, chatId, chunk);
  }

  return {
    ...digest.stats,
    messagesSent: chunks.length,
  };
}

async function loadClientsFromSupabaseForDigest() {
  const supabase = createSupabaseAdminClient();

  const [clientsResult, activitiesResult] = await Promise.all([
    supabase
      .from("crm_clients")
      .select("*")
      .neq("status", "won")
      .neq("status", "lost")
      .order("next_follow_up_date", { ascending: true }),
    supabase
      .from("crm_client_activities")
      .select("*")
      .order("created_at", { ascending: false }),
  ]);

  if (clientsResult.error || activitiesResult.error) {
    throw new Error(
      clientsResult.error?.message || activitiesResult.error?.message || "Не удалось загрузить данные CRM."
    );
  }

  const clientsRows = (clientsResult.data ?? []) as DbClientRow[];
  const activitiesRows = (activitiesResult.data ?? []) as DbActivityRow[];

  const activityMap = new Map<string, DbActivityRow[]>();
  for (const activity of activitiesRows) {
    const list = activityMap.get(activity.client_id) ?? [];
    list.push(activity);
    activityMap.set(activity.client_id, list);
  }

  const clients = clientsRows.map((row) => mapDbClientToClient(row, activityMap.get(row.id) ?? []));

  const todayKey = todayKeyInTz(KZ_TZ);
  const actionableRows = clientsRows.filter(
    (r) => r.next_follow_up_date && r.next_follow_up_date <= todayKey
  );

  return { clients, actionableRows };
}

export async function GET(request: NextRequest) {
  if (!(await hasAccess(request))) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { clients, actionableRows } = await loadClientsFromSupabaseForDigest();
    const whatsappItems = await loadWhatsappItems(actionableRows);
    const result = await sendDigest(clients, whatsappItems);
    return NextResponse.json({ ok: true, mode: "cron", ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  if (!(await hasAccess(request))) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = (await request.json().catch(() => ({}))) as { clients?: Client[] };

    if (Array.isArray(body.clients) && body.clients.length > 0) {
      const result = await sendDigest(body.clients);
      return NextResponse.json({ ok: true, mode: "manual", ...result });
    }

    const { clients, actionableRows } = await loadClientsFromSupabaseForDigest().catch(() => ({
      clients: MOCK_CLIENTS,
      actionableRows: [] as DbClientRow[],
    }));
    const whatsappItems = await loadWhatsappItems(actionableRows);
    const result = await sendDigest(clients, whatsappItems);

    return NextResponse.json({ ok: true, mode: "manual", ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
