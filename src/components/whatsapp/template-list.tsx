"use client";

import { Edit3, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getTemplatePreview } from "@/lib/whatsapp/render-template";
import { WHATSAPP_CATEGORY_LABELS } from "@/lib/whatsapp/template-categories";
import { WhatsappTemplate } from "@/types/whatsapp-template";

type WhatsappTemplateListProps = {
  templates: WhatsappTemplate[];
  onEdit: (template: WhatsappTemplate) => void;
  onDelete: (template: WhatsappTemplate) => void;
};

export function WhatsappTemplateList({
  templates,
  onEdit,
  onDelete,
}: WhatsappTemplateListProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Список шаблонов</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {templates.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white p-6 text-center">
            <p className="text-base font-semibold text-slate-900">Шаблонов пока нет</p>
            <p className="mt-1 text-sm text-slate-600">
              Создайте первый шаблон, чтобы быстрее писать клиентам и не набирать сообщения вручную.
            </p>
          </div>
        ) : null}

        {templates.map((template) => (
          <div
            key={template.id}
            className="rounded-xl border border-slate-200 bg-white p-4"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-slate-900">{template.title}</p>
                <p className="mt-1 text-xs text-slate-500">
                  Обновлен: {new Date(template.updatedAt).toLocaleString("ru-RU")}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline">
                  {WHATSAPP_CATEGORY_LABELS[template.category]}
                </Badge>
                <Badge variant={template.isActive ? "success" : "secondary"}>
                  {template.isActive ? "Активен" : "Неактивен"}
                </Badge>
              </div>
            </div>

            <p className="mt-3 text-sm text-slate-700">{getTemplatePreview(template.body, 160)}</p>

            <div className="mt-3 flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => onEdit(template)}>
                <Edit3 className="mr-1.5 h-4 w-4" />
                Редактировать
              </Button>
              <Button variant="destructive" size="sm" onClick={() => onDelete(template)}>
                <Trash2 className="mr-1.5 h-4 w-4" />
                Удалить
              </Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

