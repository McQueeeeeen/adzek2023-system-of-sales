import { ClientStatus } from "@/types/client";

export const AI_WHATSAPP_GOALS = [
  "get_reply",
  "push_to_order",
  "unblock_decision",
  "revive_after_silence",
] as const;

export const AI_WHATSAPP_TONES = ["soft", "business", "hard"] as const;
export const AI_WHATSAPP_PRESSURES = ["low", "medium", "high"] as const;
export const AI_WHATSAPP_LENGTHS = ["short", "medium"] as const;

export type AiWhatsappGoal = (typeof AI_WHATSAPP_GOALS)[number];
export type AiWhatsappTone = (typeof AI_WHATSAPP_TONES)[number];
export type AiWhatsappPressure = (typeof AI_WHATSAPP_PRESSURES)[number];
export type AiWhatsappLength = (typeof AI_WHATSAPP_LENGTHS)[number];

export type AiWhatsappGenerationOptions = {
  goal: AiWhatsappGoal;
  tone: AiWhatsappTone;
  pressure: AiWhatsappPressure;
  length: AiWhatsappLength;
};

export type AiWhatsappMessageVariant = {
  label: string;
  text: string;
};

export type AiWhatsappGenerationResponse = {
  messages: AiWhatsappMessageVariant[];
};

export const AI_WHATSAPP_GOAL_LABELS: Record<AiWhatsappGoal, string> = {
  get_reply: "получить ответ",
  push_to_order: "дожать до заказа",
  unblock_decision: "вскрыть блокер",
  revive_after_silence: "вернуть после игнора",
};

export const AI_WHATSAPP_TONE_LABELS: Record<AiWhatsappTone, string> = {
  soft: "мягкий",
  business: "деловой",
  hard: "жесткий",
};

export const AI_WHATSAPP_PRESSURE_LABELS: Record<AiWhatsappPressure, string> = {
  low: "низкое",
  medium: "среднее",
  high: "высокое",
};

export const AI_WHATSAPP_LENGTH_LABELS: Record<AiWhatsappLength, string> = {
  short: "коротко",
  medium: "средне",
};

export function defaultAiOptionsByStatus(
  status: ClientStatus
): AiWhatsappGenerationOptions {
  if (status === "negotiating") {
    return {
      goal: "push_to_order",
      tone: "business",
      pressure: "high",
      length: "short",
    };
  }

  if (status === "waiting-test" || status === "sample") {
    return {
      goal: "get_reply",
      tone: "business",
      pressure: "medium",
      length: "short",
    };
  }

  if (status === "lost") {
    return {
      goal: "revive_after_silence",
      tone: "soft",
      pressure: "low",
      length: "short",
    };
  }

  return {
    goal: "get_reply",
    tone: "business",
    pressure: "medium",
    length: "short",
  };
}

export function isValidAiOptions(
  value: unknown
): value is AiWhatsappGenerationOptions {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.goal === "string" &&
    typeof candidate.tone === "string" &&
    typeof candidate.pressure === "string" &&
    typeof candidate.length === "string" &&
    (AI_WHATSAPP_GOALS as readonly string[]).includes(candidate.goal) &&
    (AI_WHATSAPP_TONES as readonly string[]).includes(candidate.tone) &&
    (AI_WHATSAPP_PRESSURES as readonly string[]).includes(candidate.pressure) &&
    (AI_WHATSAPP_LENGTHS as readonly string[]).includes(candidate.length)
  );
}

