"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { renderWhatsappTemplate } from "@/lib/whatsapp/render-template";
import { WHATSAPP_CATEGORY_LABELS } from "@/lib/whatsapp/template-categories";
import {
  SAMPLE_TEMPLATE_VARIABLES,
  WHATSAPP_VARIABLE_HELP,
} from "@/lib/whatsapp/template-variables";
import {
  WHATSAPP_TEMPLATE_CATEGORIES,
  WhatsappTemplate,
  WhatsappTemplateInput,
} from "@/types/whatsapp-template";

type WhatsappTemplateFormProps = {
  mode: "create" | "edit";
  value: WhatsappTemplateInput;
  editingTemplate?: WhatsappTemplate | null;
  loading?: boolean;
  onChange: (value: WhatsappTemplateInput) => void;
  onCancelEdit?: () => void;
  onSubmit: () => void;
};

export function WhatsappTemplateForm({
  mode,
  value,
  editingTemplate,
  loading,
  onChange,
  onCancelEdit,
  onSubmit,
}: WhatsappTemplateFormProps) {
  const renderedPreview = renderWhatsappTemplate(value.body, SAMPLE_TEMPLATE_VARIABLES);

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {mode === "create" ? "Создать шаблон" : "Редактирование шаблона"}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="template-title">Название</Label>
            <Input
              id="template-title"
              value={value.title}
              placeholder="Например: Уточнение по тесту"
              onChange={(e) => onChange({ ...value, title: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="template-category">Категория</Label>
            <Select
              id="template-category"
              value={value.category}
              onChange={(e) =>
                onChange({
                  ...value,
                  category: e.target.value as WhatsappTemplateInput["category"],
                })
              }
            >
              {WHATSAPP_TEMPLATE_CATEGORIES.map((category) => (
                <option key={category} value={category}>
                  {WHATSAPP_CATEGORY_LABELS[category]}
                </option>
              ))}
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="template-body">Текст сообщения</Label>
          <Textarea
            id="template-body"
            className="min-h-[170px]"
            value={value.body}
            placeholder="Здравствуйте, {client_name}! Уточняю по тесту для {company}..."
            onChange={(e) => onChange({ ...value, body: e.target.value })}
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="template-active">Статус</Label>
            <Select
              id="template-active"
              value={value.isActive ? "active" : "inactive"}
              onChange={(e) =>
                onChange({ ...value, isActive: e.target.value === "active" })
              }
            >
              <option value="active">Активен</option>
              <option value="inactive">Неактивен</option>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Доступные переменные</Label>
            <div className="flex flex-wrap gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
              {WHATSAPP_VARIABLE_HELP.map((item) => (
                <Badge key={item.key} variant="outline">
                  {`{${item.key}}`}
                </Badge>
              ))}
            </div>
          </div>
        </div>

        <div className="grid gap-4 xl:grid-cols-2">
          <div className="rounded-lg border border-slate-200 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Raw template
            </p>
            <p className="mt-2 whitespace-pre-line text-sm text-slate-700">{value.body || "—"}</p>
          </div>
          <div className="rounded-lg border border-teal-200 bg-teal-50/60 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-teal-700">
              Preview with sample data
            </p>
            <p className="mt-2 whitespace-pre-line text-sm text-slate-800">
              {renderedPreview || "—"}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            onClick={onSubmit}
            disabled={loading}
          >
            {loading
              ? "Сохраняем..."
              : mode === "create"
                ? "Сохранить шаблон"
                : "Сохранить изменения"}
          </Button>
          {mode === "edit" ? (
            <Button variant="outline" onClick={onCancelEdit} disabled={loading}>
              Отменить редактирование
            </Button>
          ) : null}
          {editingTemplate ? (
            <p className="text-xs text-slate-500">
              Обновлен: {new Date(editingTemplate.updatedAt).toLocaleString("ru-RU")}
            </p>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}

