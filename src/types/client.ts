export const CLIENT_STATUSES = [
  "new",
  "sample",
  "waiting-test",
  "interested",
  "negotiating",
  "won",
  "lost",
] as const;

export type ClientStatus = (typeof CLIENT_STATUSES)[number];

export const MESSAGE_TEMPLATE_IDS = [
  "first_followup",
  "not_tested_yet",
  "second_followup",
  "tested_compare",
  "neutral_push",
  "wow_close",
  "thinking_risk_reversal",
  "silent_ping_1",
  "silent_ping_2",
  "silent_final",
  "post_deal_thanks",
  "post_delivery_followup",
] as const;

export type MessageTemplateId = (typeof MESSAGE_TEMPLATE_IDS)[number];

export type HistoryEventType =
  | "sample_sent"
  | "whatsapp_followup"
  | "meeting"
  | "status_change"
  | "note";

export type ClientHistoryEvent = {
  id: string;
  date: string;
  type: HistoryEventType;
  title: string;
  description?: string;
};

export type Client = {
  id: string;
  companyName: string;
  name: string;
  whatsappNumber: string;
  email: string;
  city: string;
  segment: string;
  product: string;
  status: ClientStatus;
  priority: "high" | "medium" | "low";
  assignedTo: string;
  sampleSentDate: string;
  followUpDate: string;
  messageTemplate: MessageTemplateId;
  nextAction: string;
  lastContactAt: string;
  estimatedMonthlyValue: number;
  notes: string;
  createdAt: string;
  updatedAt: string;
  history: ClientHistoryEvent[];
};

export type ClientInput = Omit<
  Client,
  "id" | "createdAt" | "updatedAt" | "history" | "lastContactAt" | "messageTemplate"
> & {
  id?: string;
  lastContactAt?: string;
};
