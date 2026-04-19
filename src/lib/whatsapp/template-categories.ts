import { ClientStatus } from "@/types/client";
import { WhatsappTemplateCategory } from "@/types/whatsapp-template";

export const WHATSAPP_CATEGORY_LABELS: Record<WhatsappTemplateCategory, string> = {
  first_followup: "Первый follow-up",
  after_sample: "После пробника",
  overdue_followup: "Просроченное касание",
  push: "Дожим",
  final_message: "Финальное сообщение",
  post_deal: "После сделки",
  free_form: "Свободный шаблон",
};

const RECOMMENDED_BY_STATUS: Record<ClientStatus, WhatsappTemplateCategory[]> = {
  new: ["first_followup", "after_sample", "free_form"],
  sample: ["after_sample", "push", "first_followup"],
  "waiting-test": ["after_sample", "overdue_followup", "push"],
  interested: ["push", "after_sample", "final_message"],
  negotiating: ["push", "final_message", "overdue_followup"],
  won: ["post_deal", "free_form", "push"],
  lost: ["final_message", "free_form", "overdue_followup"],
};

export function getRecommendedCategoriesByStatus(status: ClientStatus) {
  return RECOMMENDED_BY_STATUS[status] ?? ["free_form"];
}

