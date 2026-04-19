import { getDefaultTemplateId } from "@/lib/whatsapp-templates";
import { Client, ClientHistoryEvent, ClientInput, HistoryEventType } from "@/types/client";

export type DbClientRow = {
  id: string;
  owner_id: string;
  name: string;
  company: string;
  phone: string;
  email: string | null;
  city: string | null;
  segment: string | null;
  product: string | null;
  status: Client["status"];
  priority: Client["priority"];
  potential_kzt: number | null;
  next_follow_up_date: string | null;
  next_action: string | null;
  notes: string | null;
  assigned_to: string | null;
  sample_sent_date: string | null;
  last_contact_at: string | null;
  message_template: Client["messageTemplate"] | null;
  created_at: string;
  updated_at: string;
};

export type DbActivityRow = {
  id: string;
  client_id: string;
  owner_id: string;
  type: HistoryEventType;
  action: string;
  result: string | null;
  created_at: string;
};

function isoDateFromDateOnly(value?: string | null) {
  if (!value) return new Date().toISOString();
  return new Date(`${value}T09:00:00`).toISOString();
}

function toDateOnly(value: string) {
  return new Date(value).toISOString().slice(0, 10);
}

export function mapDbActivityToClientEvent(row: DbActivityRow): ClientHistoryEvent {
  return {
    id: row.id,
    date: row.created_at,
    type: row.type,
    title: row.action,
    description: row.result || undefined,
  };
}

export function mapDbClientToClient(
  row: DbClientRow,
  activities: DbActivityRow[]
): Client {
  const history = activities
    .map(mapDbActivityToClientEvent)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return {
    id: row.id,
    companyName: row.company,
    name: row.name,
    whatsappNumber: row.phone,
    email: row.email ?? "",
    city: row.city ?? "",
    segment: row.segment ?? "",
    product: row.product ?? "",
    status: row.status,
    priority: row.priority,
    assignedTo: row.assigned_to ?? "Ayan",
    sampleSentDate: isoDateFromDateOnly(row.sample_sent_date ?? row.created_at.slice(0, 10)),
    followUpDate: isoDateFromDateOnly(row.next_follow_up_date),
    messageTemplate: row.message_template ?? getDefaultTemplateId(row.status),
    nextAction: row.next_action ?? "",
    lastContactAt:
      row.last_contact_at ?? history[0]?.date ?? row.updated_at ?? row.created_at,
    estimatedMonthlyValue: Number(row.potential_kzt ?? 0),
    notes: row.notes ?? "",
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    history,
  };
}

export function mapClientInputToDbClient(input: ClientInput) {
  return {
    name: input.name,
    company: input.companyName,
    phone: input.whatsappNumber,
    email: input.email || null,
    city: input.city || null,
    segment: input.segment || null,
    product: input.product || null,
    status: input.status,
    priority: input.priority,
    potential_kzt: Number(input.estimatedMonthlyValue || 0),
    next_follow_up_date: toDateOnly(input.followUpDate),
    next_action: input.nextAction,
    notes: input.notes || null,
    assigned_to: input.assignedTo || null,
    sample_sent_date: toDateOnly(input.sampleSentDate),
    last_contact_at: input.lastContactAt || null,
  };
}
