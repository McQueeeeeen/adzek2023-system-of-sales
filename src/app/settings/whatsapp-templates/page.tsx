"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { WhatsappTemplateForm } from "@/components/whatsapp/template-form";
import { WhatsappTemplateList } from "@/components/whatsapp/template-list";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import {
  DbWhatsappTemplateRow,
  mapDbWhatsappTemplateToModel,
  mapInputToDbWhatsappTemplate,
} from "@/lib/whatsapp/template-mappers";
import { WHATSAPP_CATEGORY_LABELS } from "@/lib/whatsapp/template-categories";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import {
  WHATSAPP_TEMPLATE_CATEGORIES,
  WhatsappTemplate,
  WhatsappTemplateInput,
} from "@/types/whatsapp-template";

const DEFAULT_TEMPLATE_INPUT: WhatsappTemplateInput = {
  title: "",
  category: "first_followup",
  body: "Здравствуйте, {client_name}!\n\nПишу уточнить по текущему этапу для {company}.\n\nСледующее действие: {next_action}.",
  isActive: true,
};

export default function WhatsappTemplatesSettingsPage() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<"all" | (typeof WHATSAPP_TEMPLATE_CATEGORIES)[number]>("all");
  const [activeFilter, setActiveFilter] = useState<"all" | "active" | "inactive">("all");
  const [templates, setTemplates] = useState<WhatsappTemplate[]>([]);
  const [draft, setDraft] = useState<WhatsappTemplateInput>(DEFAULT_TEMPLATE_INPUT);
  const [editingTemplate, setEditingTemplate] = useState<WhatsappTemplate | null>(null);

  const loadTemplates = useCallback(async () => {
    if (!supabase) {
      setError("Supabase не настроен. Проверьте переменные окружения в Vercel.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setError("Сессия недоступна. Войдите заново.");
      setLoading(false);
      return;
    }

    const { data, error: loadError } = await supabase
      .from("crm_whatsapp_templates")
      .select("*")
      .eq("owner_id", user.id)
      .order("updated_at", { ascending: false });

    if (loadError) {
      setError(loadError.message);
      setLoading(false);
      return;
    }

    const mapped = ((data ?? []) as DbWhatsappTemplateRow[]).map(
      mapDbWhatsappTemplateToModel
    );
    setTemplates(mapped);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    void loadTemplates();
  }, [loadTemplates]);

  const filteredTemplates = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    return templates.filter((template) => {
      const matchesSearch =
        normalizedSearch.length === 0 ||
        template.title.toLowerCase().includes(normalizedSearch) ||
        template.body.toLowerCase().includes(normalizedSearch);

      const matchesCategory =
        categoryFilter === "all" || template.category === categoryFilter;

      const matchesActive =
        activeFilter === "all" ||
        (activeFilter === "active" && template.isActive) ||
        (activeFilter === "inactive" && !template.isActive);

      return matchesSearch && matchesCategory && matchesActive;
    });
  }, [activeFilter, categoryFilter, search, templates]);

  function resetForm() {
    setDraft(DEFAULT_TEMPLATE_INPUT);
    setEditingTemplate(null);
  }

  async function handleSaveTemplate() {
    if (!supabase) {
      setError("Supabase не настроен. Проверьте переменные окружения в Vercel.");
      return;
    }

    if (!draft.title.trim() || !draft.body.trim()) {
      setError("Заполните название и текст шаблона.");
      return;
    }

    setSaving(true);
    setError("");

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setSaving(false);
      setError("Сессия недоступна. Войдите заново.");
      return;
    }

    const payload = mapInputToDbWhatsappTemplate(draft);

    if (editingTemplate) {
      const { error: updateError } = await supabase
        .from("crm_whatsapp_templates")
        .update(payload)
        .eq("id", editingTemplate.id)
        .eq("owner_id", user.id);

      if (updateError) {
        setSaving(false);
        setError(updateError.message);
        return;
      }
    } else {
      const { error: insertError } = await supabase
        .from("crm_whatsapp_templates")
        .insert({
          owner_id: user.id,
          ...payload,
        });

      if (insertError) {
        setSaving(false);
        setError(insertError.message);
        return;
      }
    }

    setSaving(false);
    resetForm();
    await loadTemplates();
  }

  function handleEditTemplate(template: WhatsappTemplate) {
    setEditingTemplate(template);
    setDraft({
      title: template.title,
      category: template.category,
      body: template.body,
      isActive: template.isActive,
    });
  }

  async function handleDeleteTemplate(template: WhatsappTemplate) {
    if (!supabase) return;
    const approved = window.confirm(
      `Удалить шаблон «${template.title}»? Это действие нельзя отменить.`
    );
    if (!approved) return;

    const { error: deleteError } = await supabase
      .from("crm_whatsapp_templates")
      .delete()
      .eq("id", template.id);

    if (deleteError) {
      setError(deleteError.message);
      return;
    }

    if (editingTemplate?.id === template.id) {
      resetForm();
    }
    await loadTemplates();
  }

  return (
    <div className="page-stack">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="page-title">Шаблоны WhatsApp</h2>
          <p className="page-subtitle">
            Создавайте рабочие сообщения, подставляйте данные клиента и пишите быстрее.
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/settings">
            <ArrowLeft className="mr-1.5 h-4 w-4" />
            Назад в настройки
          </Link>
        </Button>
      </header>

      {error ? (
        <Card>
          <CardContent className="py-4 text-sm text-rose-700">{error}</CardContent>
        </Card>
      ) : null}

      <WhatsappTemplateForm
        mode={editingTemplate ? "edit" : "create"}
        value={draft}
        editingTemplate={editingTemplate}
        loading={saving}
        onChange={setDraft}
        onSubmit={() => void handleSaveTemplate()}
        onCancelEdit={resetForm}
      />

      <Card>
        <CardContent className="grid gap-3 pt-6 md:grid-cols-[1fr_220px_180px]">
          <Input
            placeholder="Поиск по названию или тексту"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Select
            value={categoryFilter}
            onChange={(e) =>
              setCategoryFilter(
                e.target.value as "all" | (typeof WHATSAPP_TEMPLATE_CATEGORIES)[number]
              )
            }
          >
            <option value="all">Все категории</option>
            {WHATSAPP_TEMPLATE_CATEGORIES.map((category) => (
              <option key={category} value={category}>
                {WHATSAPP_CATEGORY_LABELS[category]}
              </option>
            ))}
          </Select>
          <Select
            value={activeFilter}
            onChange={(e) =>
              setActiveFilter(e.target.value as "all" | "active" | "inactive")
            }
          >
            <option value="all">Все статусы</option>
            <option value="active">Только активные</option>
            <option value="inactive">Только неактивные</option>
          </Select>
        </CardContent>
      </Card>

      {loading ? (
        <Card>
          <CardContent className="py-4 text-sm text-slate-600">
            Загружаем шаблоны...
          </CardContent>
        </Card>
      ) : (
        <WhatsappTemplateList
          templates={filteredTemplates}
          onEdit={handleEditTemplate}
          onDelete={(template) => void handleDeleteTemplate(template)}
        />
      )}
    </div>
  );
}

