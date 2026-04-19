import { NextRequest, NextResponse } from "next/server";
import { MOCK_CLIENTS } from "@/lib/mock-data";
import { formatTelegramDigest, splitTelegramMessage } from "@/lib/telegram-digest";
import { Client } from "@/types/client";

function hasAccess(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true;

  const authHeader = request.headers.get("authorization");
  const querySecret = request.nextUrl.searchParams.get("secret");

  return authHeader === `Bearer ${secret}` || querySecret === secret;
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

async function sendDigest(clients: Client[]) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!botToken || !chatId) {
    throw new Error("Missing TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID.");
  }

  const digest = formatTelegramDigest(clients);
  const chunks = splitTelegramMessage(digest.text);

  for (const chunk of chunks) {
    await sendTelegramMessage(botToken, chatId, chunk);
  }

  return {
    ...digest.stats,
    messagesSent: chunks.length,
  };
}

export async function GET(request: NextRequest) {
  if (!hasAccess(request)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await sendDigest(MOCK_CLIENTS);
    return NextResponse.json({ ok: true, mode: "cron", ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  if (!hasAccess(request)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = (await request.json().catch(() => ({}))) as { clients?: Client[] };
    const clients = Array.isArray(body.clients) && body.clients.length > 0 ? body.clients : MOCK_CLIENTS;
    const result = await sendDigest(clients);

    return NextResponse.json({ ok: true, mode: "manual", ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
