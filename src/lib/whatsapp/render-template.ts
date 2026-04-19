import { WhatsappTemplateVariables } from "@/lib/whatsapp/template-variables";

export function renderWhatsappTemplate(
  body: string,
  variables: WhatsappTemplateVariables
) {
  return body.replace(/\{([a-z0-9_]+)\}/gi, (_match, variableName: string) => {
    const key = variableName.toLowerCase();
    return variables[key] ?? `{${variableName}}`;
  });
}

export function getTemplatePreview(body: string, max = 120) {
  const normalized = body.replace(/\s+/g, " ").trim();
  if (normalized.length <= max) return normalized;
  return `${normalized.slice(0, max - 3)}...`;
}

