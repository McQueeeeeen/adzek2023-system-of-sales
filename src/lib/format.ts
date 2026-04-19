import { ClientStatus } from "@/types/client";

const dateFormatter = new Intl.DateTimeFormat("ru-RU", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

export const CURRENCY_SYMBOL = "₸";
export const HIGH_VALUE_THRESHOLD_KZT = 1_000_000;

export function formatDate(value: string) {
  return dateFormatter.format(new Date(value));
}

export function formatKzt(amount: number) {
  const safeAmount = Number.isFinite(amount) ? Math.round(amount) : 0;
  return `${safeAmount.toLocaleString("ru-RU")} ${CURRENCY_SYMBOL}`;
}

export const formatCurrency = formatKzt;

export const STATUS_LABELS: Record<ClientStatus, string> = {
  new: "Новый",
  sample: "Пробник",
  "waiting-test": "Ждет тест",
  interested: "Интерес",
  negotiating: "Переговоры",
  won: "Сделка",
  lost: "Отказ",
};
