import {
  Client,
  ClientStatus,
  MESSAGE_TEMPLATE_IDS,
  MessageTemplateId,
} from "@/types/client";

type TemplateBuilder = (client: Pick<Client, "name" | "companyName" | "product">) => string;

export const WHATSAPP_TEMPLATE_LABELS: Record<MessageTemplateId, string> = {
  first_followup: "Первый follow-up (2 дня)",
  not_tested_yet: "Еще не пробовали",
  second_followup: "Второй follow-up (5 дней)",
  tested_compare: "Проверили — сравнение",
  neutral_push: "Норм / неплохо — дожим",
  wow_close: "Хороший отклик — закрытие",
  thinking_risk_reversal: "Думают — снять риск",
  silent_ping_1: "Нет ответа — попытка 1",
  silent_ping_2: "Нет ответа — попытка 2",
  silent_final: "Нет ответа — финал",
  post_deal_thanks: "После сделки — спасибо",
  post_delivery_followup: "После поставки — follow-up",
};

const TEMPLATE_BUILDERS: Record<MessageTemplateId, TemplateBuilder> = {
  first_followup: (client) =>
    `Здравствуйте! Это Adzek2023.\n\nУдалось протестировать ${client.product} в работе?\n\nВажно понять результат, чтобы корректно предложить следующий шаг.`,
  not_tested_yet: () =>
    "Понял.\n\nКогда примерно планируете протестировать?\n\nЕсли нужно, подскажу, как проверить так, чтобы сразу увидеть разницу.",
  second_followup: (client) =>
    `Хотел уточнить результат теста по ${client.product}.\n\nУдалось проверить в реальной загрузке?\n\nИнтересует результат по качеству и расходу.`,
  tested_compare: () =>
    "Если сравнивать с тем, что используете сейчас, есть разница по качеству или расходу?",
  neutral_push: () =>
    "Понял.\n\nЕсть смысл проверить в рабочем объеме.\n\nМожем сделать небольшую тестовую поставку для стабильного замера результата.",
  wow_close: () =>
    "Отлично.\n\nПредлагаю не откладывать и перейти на тестовую поставку.\n\nПодберем объем под вашу загрузку.",
  thinking_risk_reversal: () =>
    "Можно начать с минимального объема.\n\nТак вы проверите результат в реальной работе без лишних затрат.\n\nЕсли не подойдет — остановимся.",
  silent_ping_1: () =>
    "Похоже, вы еще не успели протестировать.\n\nКогда планируете проверить?",
  silent_ping_2: () =>
    "Если тест еще не проводили, могу подсказать короткий сценарий проверки, чтобы сразу увидеть разницу.",
  silent_final: () =>
    "Правильно понимаю, что сейчас тест не в приоритете?\n\nТогда не буду отвлекать.\n\nЕсли вернетесь к вопросу — напишите.",
  post_deal_thanks: () =>
    "Спасибо за заказ.\n\nБуду на связи по результату — важно понять, как средство покажет себя в работе.",
  post_delivery_followup: () =>
    "Хотел уточнить результат использования.\n\nКак средство показывает себя в работе?\n\nЕсть ли разница по сравнению с тем, что было раньше?",
};

export function getDefaultTemplateId(status: ClientStatus): MessageTemplateId {
  switch (status) {
    case "new":
    case "sample":
      return "first_followup";
    case "waiting-test":
      return "second_followup";
    case "interested":
    case "negotiating":
      return "neutral_push";
    case "won":
      return "post_deal_thanks";
    case "lost":
      return "silent_final";
    default:
      return "first_followup";
  }
}

export function buildTemplateMessage(
  templateId: MessageTemplateId,
  client: Pick<Client, "name" | "companyName" | "product">
) {
  return TEMPLATE_BUILDERS[templateId](client);
}

export function getLegacyTemplateOptions(
  client: Pick<Client, "name" | "companyName" | "product">
) {
  return MESSAGE_TEMPLATE_IDS.map((id) => ({
    id,
    title: WHATSAPP_TEMPLATE_LABELS[id],
    body: buildTemplateMessage(id, client),
    category: "legacy" as const,
  }));
}

export function buildWhatsappLink(phone: string, text: string) {
  const cleaned = phone.replace(/[^\d]/g, "");
  return `https://wa.me/${cleaned}?text=${encodeURIComponent(text)}`;
}

