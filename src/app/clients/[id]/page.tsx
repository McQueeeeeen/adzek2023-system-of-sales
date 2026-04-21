"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  AlertTriangle,
  CalendarClock,
  MessageCircle,
  PencilLine,
  Plus,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { ClientPriorityBadge } from "@/components/clients/client-priority-badge";
import { ClientStatusBadge } from "@/components/clients/client-status-badge";
import { ClientTimeline } from "@/components/clients/client-timeline";
import { useClientStore } from "@/components/providers/client-store-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { getClientById } from "@/lib/client-selectors";
import { mapDbActivityToClientEvent } from "@/lib/crm-mappers";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import {
  formatCurrency,
  formatDate,
  HIGH_VALUE_THRESHOLD_KZT,
  STATUS_LABELS,
} from "@/lib/format";
import {
  buildWhatsappLink,
  getLegacyTemplateOptions,
} from "@/lib/whatsapp-templates";
import { renderWhatsappTemplate } from "@/lib/whatsapp/render-template";
import { getRecommendedCategoriesByStatus } from "@/lib/whatsapp/template-categories";
import {
  buildClientTemplateVariables,
  WHATSAPP_VARIABLE_HELP,
} from "@/lib/whatsapp/template-variables";
import {
  DbWhatsappTemplateRow,
  mapDbWhatsappTemplateToModel,
} from "@/lib/whatsapp/template-mappers";
import {
  CLIENT_STATUSES,
  ClientHistoryEvent,
  ClientStatus,
} from "@/types/client";
import { WhatsappTemplate } from "@/types/whatsapp-template";

function offsetIsoDate(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString();
}

function defaultNextAction(status: ClientStatus) {
  switch (status) {
    case "new":
      return "Сделать первое касание и уточнить контакт ЛПР";
    case "sample":
      return "Подтвердить получение пробника и назначить тест";
    case "waiting-test":
      return "Запросить результат теста и выявить барьеры";
    case "interested":
      return "Перевести интерес в тестовую поставку";
    case "negotiating":
      return "Зафиксировать условия и закрыть на первый заказ";
    case "won":
      return "Проверить результат поставки и подготовить допродажу";
    case "lost":
      return "Поставить повторное касание через 30 дней";
    default:
      return "Определить следующий шаг";
  }
}

export default function ClientDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const { state, dispatch } = useClientStore();
  const { loading, hydrated } = state;
  const client = useMemo(() => getClientById(state.clients, id), [state.clients, id]);

  const [activities, setActivities] = useState<ClientHistoryEvent[]>([]);
  const [noteDraft, setNoteDraft] = useState("");
  const [nextActionDraft, setNextActionDraft] = useState(client?.nextAction ?? "");
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [customTemplates, setCustomTemplates] = useState<WhatsappTemplate[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(true);
  const [templatesError, setTemplatesError] = useState("");

  useEffect(() => {
    if (client) {
      setNextActionDraft(client.nextAction);
    }
  }, [client]);

  useEffect(() => {
    if (!supabase || !id) return;
    supabase
      .from("crm_client_activities")
      .select("*")
      .eq("client_id", id)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        if (data) setActivities(data.map(mapDbActivityToClientEvent));
      });
  }, [supabase, id, state.clients]);

  useEffect(() => {
    async function loadWhatsappTemplates() {
      if (!supabase) {
        setTemplatesError("Supabase не настроен.");
        setLoadingTemplates(false);
        return;
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setLoadingTemplates(false);
        return;
      }

      const { data, error } = await supabase
        .from("crm_whatsapp_templates")
        .select("*")
        .eq("owner_id", user.id)
        .eq("is_active", true)
        .order("updated_at", { ascending: false });

      if (error) {
        setTemplatesError(error.message);
        setLoadingTemplates(false);
        return;
      }

      const mapped = ((data ?? []) as DbWhatsappTemplateRow[]).map(
        mapDbWhatsappTemplateToModel
      );
      setCustomTemplates(mapped);
      setLoadingTemplates(false);
    }

    void loadWhatsappTemplates();
  }, [supabase]);

  useEffect(() => {
    if (!client || selectedTemplateId) return;

    const recommendedCategories = getRecommendedCategoriesByStatus(client.status);
    const recommendedFromCustom = customTemplates.find((template) =>
      recommendedCategories.includes(template.category)
    );

    if (recommendedFromCustom) {
      setSelectedTemplateId(recommendedFromCustom.id);
      return;
    }

    if (client.messageTemplate) {
      setSelectedTemplateId(client.messageTemplate);
      return;
    }

    const legacyFirst = getLegacyTemplateOptions({
      name: client.name,
      companyName: client.companyName,
      product: client.product,
    })[0];

    if (legacyFirst) {
      setSelectedTemplateId(legacyFirst.id);
    }
  }, [client, customTemplates, selectedTemplateId]);

  if (loading && !hydrated) {
    return (
      <div className="page-stack">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 space-y-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-24" />
        </div>
        <div className="grid gap-6 xl:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 space-y-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-6 w-full" />
            ))}
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-6 space-y-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-8 w-full" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!client) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-sm text-slate-600">Клиент не найден.</p>
          <Button className="mt-4" variant="outline" onClick={() => router.push("/clients")}>
            Вернуться к списку
          </Button>
        </CardContent>
      </Card>
    );
  }

  const currentClient = client;
  const legacyTemplates = getLegacyTemplateOptions({
    name: currentClient.name,
    companyName: currentClient.companyName,
    product: currentClient.product,
  });
  const recommendedCategories = getRecommendedCategoriesByStatus(currentClient.status);

  const recommendedTemplates = customTemplates
    .filter((template) => recommendedCategories.includes(template.category))
    .slice(0, 3);

  const selectedTemplate =
    customTemplates.find((template) => template.id === selectedTemplateId) ?? null;

  const selectedLegacyTemplate =
    legacyTemplates.find((template) => template.id === selectedTemplateId) ?? null;

  const templateMessage = selectedTemplate
    ? renderWhatsappTemplate(
        selectedTemplate.body,
        buildClientTemplateVariables(currentClient)
      )
    : selectedLegacyTemplate?.body ?? legacyTemplates[0]?.body ?? "";

  const whatsappHref = buildWhatsappLink(currentClient.whatsappNumber, templateMessage);

  async function updateStatus(nextStatus: ClientStatus) {
    if (nextStatus === currentClient.status) return;

    const suggestedAction = defaultNextAction(nextStatus);
    await dispatch({
      type: "update_client",
      payload: {
        id: currentClient.id,
        updates: {
          status: nextStatus,
          nextAction: suggestedAction,
        },
      },
    });

    await dispatch({
      type: "add_history_event",
      payload: {
        clientId: currentClient.id,
        event: {
          type: "status_change",
          title: `Статус обновлен: ${STATUS_LABELS[nextStatus]}`,
          description: `Следующий шаг: ${suggestedAction}`,
        },
      },
    });

    setNextActionDraft(suggestedAction);
  }

  async function scheduleFollowUp(days: number, label: string) {
    const date = offsetIsoDate(days);
    await dispatch({
      type: "update_client",
      payload: {
        id: currentClient.id,
        updates: { followUpDate: date },
      },
    });

    await dispatch({
      type: "add_history_event",
      payload: {
        clientId: currentClient.id,
        event: {
          type: "note",
          title: `Назначено касание: ${label}`,
          description: `Следующая дата: ${formatDate(date)}`,
        },
      },
    });
  }

  async function saveNextAction() {
    const value = nextActionDraft.trim();
    if (!value || value === currentClient.nextAction) return;

    await dispatch({
      type: "update_client",
      payload: {
        id: currentClient.id,
        updates: { nextAction: value },
      },
    });

    await dispatch({
      type: "add_history_event",
      payload: {
        clientId: currentClient.id,
        event: {
          type: "note",
          title: "Обновлено следующее действие",
          description: value,
        },
      },
    });
  }

  async function addTouchpoint() {
    const note = noteDraft.trim();
    if (!note) return;

    await dispatch({
      type: "add_history_event",
      payload: {
        clientId: currentClient.id,
        event: {
          type: "whatsapp_followup",
          title: "Добавлено касание",
          description: note,
        },
      },
    });

    setNoteDraft("");
  }

  async function sendWhatsappTemplate() {
    const templateLabel =
      selectedTemplate?.title ??
      selectedLegacyTemplate?.title ??
      "Произвольный текст";

    await dispatch({
      type: "add_history_event",
      payload: {
        clientId: currentClient.id,
        event: {
          type: "whatsapp_followup",
          title: "Отправлен шаблон WhatsApp",
          description: templateLabel,
        },
      },
    });

    window.open(whatsappHref, "_blank", "noopener,noreferrer");
  }

  const followUpDate = new Date(currentClient.followUpDate);
  const today = new Date();
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const isOverdue = followUpDate < startOfToday;

  return (
    <div className="page-stack">
      <header className="rounded-2xl border border-slate-200 bg-white p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <h2 className="page-title">{currentClient.name}</h2>
            <p className="page-subtitle">{currentClient.companyName}</p>
            <p className="page-caption">{currentClient.whatsappNumber}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button size="lg" className="h-11 px-5" onClick={sendWhatsappTemplate}>
              <MessageCircle className="mr-2 h-4 w-4" />
              Написать в WhatsApp
            </Button>
            <Button asChild variant="outline">
              <Link href={`/clients/${currentClient.id}/edit`}>
                <PencilLine className="mr-1.5 h-4 w-4" />
                Редактировать
              </Link>
            </Button>
          </div>
        </div>
      </header>

      <section className="grid gap-6 xl:grid-cols-[1.2fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle className="section-title">Карточка клиента</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-7 sm:grid-cols-2">
            <div>
              <p className="field-label">Продукт</p>
              <p className="field-value">{currentClient.product}</p>
            </div>
            <div>
              <p className="field-label">Дата пробника</p>
              <p className="field-value">{formatDate(currentClient.sampleSentDate)}</p>
            </div>
            <div>
              <p className="field-label">Статус</p>
              <div className="mt-1">
                <ClientStatusBadge status={currentClient.status} />
              </div>
            </div>
            <div>
              <p className="field-label">Приоритет</p>
              <div className="mt-1">
                <ClientPriorityBadge priority={currentClient.priority} />
              </div>
            </div>
            <div>
              <p className="field-label">Ответственный</p>
              <p className="field-value">{currentClient.assignedTo}</p>
            </div>
            <div>
              <p className="field-label">Следующее касание</p>
              <p className="field-value flex items-center gap-2">
                {isOverdue ? (
                  <AlertTriangle className="h-4 w-4 text-rose-500" />
                ) : (
                  <CalendarClock className="h-4 w-4 text-slate-500" />
                )}
                {formatDate(currentClient.followUpDate)}
              </p>
            </div>
            <div className="sm:col-span-2">
              <p className="field-label">Следующее действие</p>
              <p className="mt-1 rounded-lg bg-slate-50 p-3 text-sm font-medium text-slate-800">
                {currentClient.nextAction}
              </p>
            </div>
            <div>
              <p className="field-label">Последний контакт</p>
              <p className="field-value">{formatDate(currentClient.lastContactAt)}</p>
            </div>
            <div>
              <p className="field-label">Потенциал</p>
              <p className="field-value-strong">
                {formatCurrency(currentClient.estimatedMonthlyValue)}
              </p>
              {currentClient.estimatedMonthlyValue >= HIGH_VALUE_THRESHOLD_KZT ? (
                <p className="mt-1 text-xs font-semibold text-emerald-700">Высокий потенциал выручки</p>
              ) : null}
            </div>
            <div>
              <p className="field-label">Сегмент</p>
              <p className="field-value">{currentClient.segment || "Не указан"}</p>
            </div>
            <div>
              <p className="field-label">Город</p>
              <p className="field-value">{currentClient.city || "Не указан"}</p>
            </div>
            <div>
              <p className="field-label">Email</p>
              <p className="field-value">{currentClient.email || "Не указан"}</p>
            </div>
            <div className="sm:col-span-2">
              <p className="field-label">Контекст</p>
              <p className="mt-1 text-sm text-slate-700">{currentClient.notes || "Комментариев пока нет."}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="section-title">Быстрые действия</CardTitle>
          </CardHeader>
          <CardContent className="panel-stack">
            <div className="space-y-3">
              <p className="section-subtitle font-medium text-slate-800">Смена статуса в 1 клик</p>
              <div className="grid grid-cols-2 gap-2">
                {CLIENT_STATUSES.map((status) => (
                  <Button
                    key={status}
                    variant={currentClient.status === status ? "default" : "outline"}
                    className="justify-start"
                    onClick={() => void updateStatus(status)}
                  >
                    {STATUS_LABELS[status]}
                  </Button>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <p className="section-subtitle font-medium text-slate-800">Быстро назначить касание</p>
              <div className="grid grid-cols-3 gap-2">
                <Button variant="outline" onClick={() => void scheduleFollowUp(0, "Сегодня")}>Сегодня</Button>
                <Button variant="outline" onClick={() => void scheduleFollowUp(2, "+2 дня")}>+2</Button>
                <Button variant="outline" onClick={() => void scheduleFollowUp(5, "+5 дней")}>+5</Button>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <p className="section-subtitle font-medium text-slate-800">Шаблон WhatsApp</p>
                <Button asChild variant="outline" size="sm">
                  <Link href="/settings/whatsapp-templates">Управлять шаблонами</Link>
                </Button>
              </div>
              {recommendedTemplates.length > 0 ? (
                <div className="flex flex-wrap gap-2 rounded-lg border border-slate-200 bg-slate-50 p-2">
                  {recommendedTemplates.map((template) => (
                    <Button
                      key={template.id}
                      variant={
                        selectedTemplateId === template.id ? "default" : "outline"
                      }
                      size="sm"
                      onClick={() => setSelectedTemplateId(template.id)}
                    >
                      {template.title}
                    </Button>
                  ))}
                </div>
              ) : null}
              <Select
                value={selectedTemplateId}
                onChange={(e) => setSelectedTemplateId(e.target.value)}
              >
                <option value="">Выберите шаблон</option>
                {customTemplates.map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.title}
                  </option>
                ))}
                {legacyTemplates.map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.title} (базовый)
                  </option>
                ))}
              </Select>
              {loadingTemplates ? (
                <p className="text-xs text-slate-500">Загружаем пользовательские шаблоны...</p>
              ) : null}
              {templatesError ? (
                <p className="text-xs text-rose-700">{templatesError}</p>
              ) : null}
              <div className="flex flex-wrap gap-1">
                {WHATSAPP_VARIABLE_HELP.map((item) => (
                  <span
                    key={item.key}
                    className="rounded-md bg-slate-100 px-2 py-1 text-[11px] text-slate-600"
                  >
                    {`{${item.key}}`}
                  </span>
                ))}
              </div>
              <div className="rounded-lg bg-slate-50 p-3">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Предпросмотр</p>
                <p className="mt-1 whitespace-pre-line text-sm text-slate-700">{templateMessage}</p>
              </div>
            </div>

            <div className="space-y-3">
              <p className="section-subtitle font-medium text-slate-800">Следующее действие</p>
              <Textarea
                value={nextActionDraft}
                onChange={(e) => setNextActionDraft(e.target.value)}
                placeholder="Коротко: что делаем в следующем касании"
              />
              <Button variant="outline" onClick={() => void saveNextAction()}>Сохранить действие</Button>
            </div>

            <div className="space-y-3">
              <p className="section-subtitle font-medium text-slate-800">Добавить касание в историю</p>
              <Textarea
                value={noteDraft}
                onChange={(e) => setNoteDraft(e.target.value)}
                placeholder="Например: клиент попросил КП и условия поставки"
              />
              <Button onClick={() => void addTouchpoint()}>
                <Plus className="mr-1.5 h-4 w-4" />
                Добавить в таймлайн
              </Button>
            </div>
          </CardContent>
        </Card>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Лента действий</CardTitle>
        </CardHeader>
        <CardContent className="pt-2">
          <ClientTimeline events={activities} />
        </CardContent>
      </Card>
    </div>
  );
}

