import {
  WhatsappTemplate,
  WhatsappTemplateCategory,
  WhatsappTemplateInput,
} from "@/types/whatsapp-template";

export type DbWhatsappTemplateRow = {
  id: string;
  owner_id: string;
  title: string;
  category: WhatsappTemplateCategory;
  body: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export function mapDbWhatsappTemplateToModel(
  row: DbWhatsappTemplateRow
): WhatsappTemplate {
  return {
    id: row.id,
    ownerId: row.owner_id,
    title: row.title,
    category: row.category,
    body: row.body,
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapInputToDbWhatsappTemplate(input: WhatsappTemplateInput) {
  return {
    title: input.title.trim(),
    category: input.category,
    body: input.body,
    is_active: input.isActive,
  };
}

