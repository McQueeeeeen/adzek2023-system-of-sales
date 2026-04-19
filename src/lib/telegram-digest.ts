import { getFollowUpBucketsInTimezone } from "@/lib/client-selectors";
import { formatKzt, HIGH_VALUE_THRESHOLD_KZT, STATUS_LABELS } from "@/lib/format";
import { Client } from "@/types/client";

export const KZ_TIMEZONE = process.env.KZ_TIMEZONE || "Asia/Almaty";
const MAX_CLIENTS_PER_BLOCK = Number(process.env.TELEGRAM_BLOCK_LIMIT || "5");
const UPCOMING_LIMIT = 2;

type PriorityRank = Client["priority"];

const priorityOrder: Record<PriorityRank, number> = {
  high: 0,
  medium: 1,
  low: 2,
};

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function toKztValue(kztAmount: number) {
  return Math.round(kztAmount);
}

function sortByPriorityAndPotential(clients: Client[]) {
  return [...clients].sort((a, b) => {
    const byPriority = priorityOrder[a.priority] - priorityOrder[b.priority];
    if (byPriority !== 0) return byPriority;
    return b.estimatedMonthlyValue - a.estimatedMonthlyValue;
  });
}

function shortenAction(action: string) {
  const normalized = action.trim().replace(/\s+/g, " ");
  const lower = normalized.toLowerCase();

  const rules: Array<[RegExp, string]> = [
    [/(результат).*(тест)|(тест).*(результат)/, "Уточнить результат теста"],
    [/(перв).*(поставк)|(тестов).*(поставк)/, "Дожать на первую поставку"],
    [/(соглас).*(услов)|(услов).*(сделк)/, "Согласовать условия сделки"],
    [/(перв).*(касан)/, "Сделать первое касание"],
    [/(контакт)|(следующ.*шаг)/, "Согласовать следующий шаг"],
    [/(возраж)|(барьер)/, "Снять возражения по тесту"],
    [/(получ).*(пробник)|(пробник).*(получ)/, "Подтвердить получение пробника"],
  ];

  for (const [pattern, replacement] of rules) {
    if (pattern.test(lower)) {
      return replacement;
    }
  }

  if (normalized.length <= 46) {
    return normalized;
  }

  return `${normalized.slice(0, 43).trimEnd()}...`;
}

function clientCardLines(
  client: Client,
  options?: {
    includePotential?: boolean;
    includeStatus?: boolean;
    overdueHighMarker?: boolean;
  }
) {
  const includePotential = options?.includePotential ?? true;
  const includeStatus = options?.includeStatus ?? true;
  const overdueHighMarker = options?.overdueHighMarker ?? false;
  const marker = overdueHighMarker && client.priority === "high" ? "🔥 " : "";

  const lines = [
    `— <b>${marker}${escapeHtml(client.name)} | ${escapeHtml(client.companyName)}</b>`,
  ];

  if (includeStatus) {
    lines.push(`Статус: ${escapeHtml(STATUS_LABELS[client.status])}`);
  }

  lines.push(`Действие: ${escapeHtml(shortenAction(client.nextAction))}`);

  if (includePotential) {
    lines.push(`Потенциал: ${formatKzt(client.estimatedMonthlyValue)}`);
  }

  return lines.join("\n");
}

function sectionLines(
  title: string,
  clients: Client[],
  options: {
    includePotential?: boolean;
    includeStatus?: boolean;
    overdueHighMarker?: boolean;
  },
  limit: number
) {
  const ranked = sortByPriorityAndPotential(clients);
  const sliced = ranked.slice(0, limit);
  const lines = [`<b>${title} (${clients.length})</b>`];

  if (sliced.length === 0) {
    lines.push("— Нет задач");
    return lines;
  }

  sliced.forEach((client, index) => {
    lines.push(clientCardLines(client, options));
    if (index !== sliced.length - 1) {
      lines.push("");
    }
  });

  return lines;
}

function getFocusLine(overdue: Client[], dueToday: Client[]) {
  const actionable = [...overdue, ...dueToday];
  const hasHighValue = actionable.some(
    (client) => toKztValue(client.estimatedMonthlyValue) > HIGH_VALUE_THRESHOLD_KZT
  );

  if (hasHighValue) {
    return "Закрыть ключевые сделки сегодня";
  }

  if (overdue.length > 0) {
    return "Закрыть просроченные задачи";
  }

  return "Продвинуть клиентов по воронке сегодня";
}

export function formatTelegramDigest(
  clients: Client[],
  options?: {
    timeZone?: string;
    maxPerBlock?: number;
  }
) {
  const timeZone = options?.timeZone || KZ_TIMEZONE;
  const maxPerBlock = options?.maxPerBlock || MAX_CLIENTS_PER_BLOCK;
  const { overdue, dueToday, upcoming } = getFollowUpBucketsInTimezone(clients, timeZone);

  if (overdue.length === 0 && dueToday.length === 0 && upcoming.length === 0) {
    return {
      text: ["<b>📊 Adzek — ежедневный фокус</b>", "", "Нет активных задач на сегодня"].join(
        "\n"
      ),
      stats: { overdueCount: 0, dueTodayCount: 0, upcomingCount: 0, totalPotentialKzt: 0 },
    };
  }

  const totalPotentialKzt = [...overdue, ...dueToday].reduce(
    (sum, client) => sum + toKztValue(client.estimatedMonthlyValue),
    0
  );

  const lines = [
    "<b>📊 Adzek — ежедневный фокус</b>",
    "",
    ...sectionLines(
      "🔴 Просрочено",
      overdue,
      { includePotential: true, includeStatus: true, overdueHighMarker: true },
      maxPerBlock
    ),
    "",
    ...sectionLines(
      "🟡 На сегодня",
      dueToday,
      { includePotential: true, includeStatus: true },
      maxPerBlock
    ),
    "",
    ...sectionLines(
      "⚪ Дальше по плану",
      upcoming,
      { includePotential: false, includeStatus: false },
      UPCOMING_LIMIT
    ),
    "",
    "<b>💰 Итого потенциал:</b>",
    formatKzt(totalPotentialKzt),
    "",
    "<b>👉 Фокус:</b>",
    getFocusLine(overdue, dueToday),
  ];

  return {
    text: lines.join("\n"),
    stats: {
      overdueCount: overdue.length,
      dueTodayCount: dueToday.length,
      upcomingCount: upcoming.length,
      totalPotentialKzt,
    },
  };
}

export function splitTelegramMessage(text: string, maxLength = 3800) {
  if (text.length <= maxLength) return [text];

  const chunks: string[] = [];
  const blocks = text.split("\n\n");
  let current = "";

  for (const block of blocks) {
    const next = current ? `${current}\n\n${block}` : block;
    if (next.length <= maxLength) {
      current = next;
      continue;
    }

    if (current) chunks.push(current);

    if (block.length <= maxLength) {
      current = block;
      continue;
    }

    for (let i = 0; i < block.length; i += maxLength) {
      chunks.push(block.slice(i, i + maxLength));
    }
    current = "";
  }

  if (current) chunks.push(current);
  return chunks;
}
