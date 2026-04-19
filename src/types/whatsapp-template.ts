export const WHATSAPP_TEMPLATE_CATEGORIES = [
  "first_followup",
  "after_sample",
  "overdue_followup",
  "push",
  "final_message",
  "post_deal",
  "free_form",
] as const;

export type WhatsappTemplateCategory = (typeof WHATSAPP_TEMPLATE_CATEGORIES)[number];

export type WhatsappTemplate = {
  id: string;
  ownerId: string;
  title: string;
  category: WhatsappTemplateCategory;
  body: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type WhatsappTemplateInput = Pick<
  WhatsappTemplate,
  "title" | "category" | "body" | "isActive"
>;

