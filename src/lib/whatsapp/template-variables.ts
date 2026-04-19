import { STATUS_LABELS, formatCurrency } from "@/lib/format";
import { Client } from "@/types/client";

export type WhatsappTemplateVariables = Record<string, string>;

export const WHATSAPP_VARIABLE_HELP: Array<{ key: string; label: string }> = [
  { key: "client_name", label: "Имя клиента" },
  { key: "company", label: "Компания" },
  { key: "status", label: "Статус" },
  { key: "next_action", label: "Следующее действие" },
  { key: "potential_kzt", label: "Потенциал в тенге" },
];

export function buildClientTemplateVariables(client: Client): WhatsappTemplateVariables {
  return {
    client_name: client.name || "Клиент",
    company: client.companyName || "Компания",
    status: STATUS_LABELS[client.status],
    next_action: client.nextAction || "Уточнить следующий шаг",
    potential_kzt: formatCurrency(client.estimatedMonthlyValue),
  };
}

export const SAMPLE_TEMPLATE_VARIABLES: WhatsappTemplateVariables = {
  client_name: "Arman",
  company: "QazFood Logistics",
  status: "Пробник",
  next_action: "Уточнить результат теста и согласовать следующий шаг",
  potential_kzt: "1 071 000 ₸",
};

