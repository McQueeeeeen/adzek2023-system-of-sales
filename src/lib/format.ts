import { ClientStatus } from "@/types/client";

const dateFormatter = new Intl.DateTimeFormat("ru-RU", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

export function formatDate(value: string) {
  return dateFormatter.format(new Date(value));
}

export function formatCurrency(amount: number) {
  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(amount);
}

export const STATUS_LABELS: Record<ClientStatus, string> = {
  new: "Новый",
  sample: "Пробник",
  "waiting-test": "Ждет тест",
  interested: "Интерес",
  negotiating: "Переговоры",
  won: "Сделка",
  lost: "Отказ",
};
