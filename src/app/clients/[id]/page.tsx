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
import { ClientPriorityBadge } from "@/components/clients/client-priority-badge";
import { ClientStatusBadge } from "@/components/clients/client-status-badge";
import { ClientTimeline } from "@/components/clients/client-timeline";
import { useClientStore } from "@/components/providers/client-store-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { getClientById } from "@/lib/client-selectors";
import {
  formatCurrency,
  formatDate,
  HIGH_VALUE_THRESHOLD_KZT,
  STATUS_LABELS,
} from "@/lib/format";
import {
  buildTemplateMessage,
  buildWhatsappLink,
  getDefaultTemplateId,
  WHATSAPP_TEMPLATE_LABELS,
} from "@/lib/whatsapp-templates";
import {
  CLIENT_STATUSES,
  MESSAGE_TEMPLATE_IDS,
  ClientStatus,
  MessageTemplateId,
} from "@/types/client";

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
  const { state, dispatch } = useClientStore();
  const { loading, hydrated } = state;
  const client = useMemo(() => getClientById(state.clients, id), [state.clients, id]);

  const [noteDraft, setNoteDraft] = useState("");
  const [nextActionDraft, setNextActionDraft] = useState(client?.nextAction ?? "");
  const [templateDraft, setTemplateDraft] = useState<MessageTemplateId>(
    client?.messageTemplate ?? "first_followup"
  );

  useEffect(() => {
    if (client) {
      setNextActionDraft(client.nextAction);
      setTemplateDraft(client.messageTemplate);
    }
  }, [client]);

  if (loading && !hydrated) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-sm text-slate-600">Загружаем карточку клиента...</p>
        </CardContent>
      </Card>
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

  const templateMessage = buildTemplateMessage(templateDraft, {
    name: currentClient.name,
    companyName: currentClient.companyName,
    product: currentClient.product,
  });

  const whatsappHref = buildWhatsappLink(currentClient.whatsappNumber, templateMessage);

  async function updateStatus(nextStatus: ClientStatus) {
    if (nextStatus === currentClient.status) return;

    const suggestedAction = defaultNextAction(nextStatus);
    const nextTemplate = getDefaultTemplateId(nextStatus);

    await dispatch({
      type: "update_client",
      payload: {
        id: currentClient.id,
        updates: {
          status: nextStatus,
          nextAction: suggestedAction,
          messageTemplate: nextTemplate,
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
    setTemplateDraft(nextTemplate);
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

  async function saveTemplate(templateId: MessageTemplateId) {
    setTemplateDraft(templateId);
    if (templateId === currentClient.messageTemplate) return;

    await dispatch({
      type: "update_client",
      payload: {
        id: currentClient.id,
        updates: { messageTemplate: templateId },
      },
    });

    await dispatch({
      type: "add_history_event",
      payload: {
        clientId: currentClient.id,
        event: {
          type: "note",
          title: "Обновлен шаблон WhatsApp",
          description: WHATSAPP_TEMPLATE_LABELS[templateId],
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
    await dispatch({
      type: "add_history_event",
      payload: {
        clientId: currentClient.id,
        event: {
          type: "whatsapp_followup",
          title: "Отправлен шаблон WhatsApp",
          description: WHATSAPP_TEMPLATE_LABELS[templateDraft],
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
            <CardTitle>Карточка клиента</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-6 sm:grid-cols-2">
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-400">Продукт</p>
              <p className="mt-1 text-sm font-medium text-slate-800">{currentClient.product}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-400">Дата пробника</p>
              <p className="mt-1 text-sm font-medium text-slate-800">{formatDate(currentClient.sampleSentDate)}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-400">Статус</p>
              <div className="mt-1">
                <ClientStatusBadge status={currentClient.status} />
              </div>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-400">Приоритет</p>
              <div className="mt-1">
                <ClientPriorityBadge priority={currentClient.priority} />
              </div>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-400">Ответственный</p>
              <p className="mt-1 text-sm font-medium text-slate-800">{currentClient.assignedTo}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-400">Следующее касание</p>
              <p className="mt-1 flex items-center gap-2 text-sm font-medium text-slate-800">
                {isOverdue ? (
                  <AlertTriangle className="h-4 w-4 text-rose-500" />
                ) : (
                  <CalendarClock className="h-4 w-4 text-slate-500" />
                )}
                {formatDate(currentClient.followUpDate)}
              </p>
            </div>
            <div className="sm:col-span-2">
              <p className="text-xs uppercase tracking-wide text-slate-400">Следующее действие</p>
              <p className="mt-1 rounded-lg bg-slate-50 p-3 text-sm font-medium text-slate-800">
                {currentClient.nextAction}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-400">Последний контакт</p>
              <p className="mt-1 text-sm font-medium text-slate-800">{formatDate(currentClient.lastContactAt)}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-400">Потенциал</p>
              <p className="mt-1 text-sm font-semibold text-slate-900">
                {formatCurrency(currentClient.estimatedMonthlyValue)}
              </p>
              {currentClient.estimatedMonthlyValue >= HIGH_VALUE_THRESHOLD_KZT ? (
                <p className="mt-1 text-xs font-semibold text-emerald-700">Высокий потенциал выручки</p>
              ) : null}
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-400">Сегмент</p>
              <p className="mt-1 text-sm font-medium text-slate-800">{currentClient.segment || "Не указан"}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-400">Город</p>
              <p className="mt-1 text-sm font-medium text-slate-800">{currentClient.city || "Не указан"}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-400">Email</p>
              <p className="mt-1 text-sm font-medium text-slate-800">{currentClient.email || "Не указан"}</p>
            </div>
            <div className="sm:col-span-2">
              <p className="text-xs uppercase tracking-wide text-slate-400">Контекст</p>
              <p className="mt-1 text-sm text-slate-700">{currentClient.notes || "Комментариев пока нет."}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Быстрые действия</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <p className="text-sm font-medium text-slate-800">Смена статуса в 1 клик</p>
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

            <div className="space-y-2">
              <p className="text-sm font-medium text-slate-800">Быстро назначить касание</p>
              <div className="grid grid-cols-3 gap-2">
                <Button variant="outline" onClick={() => void scheduleFollowUp(0, "Сегодня")}>Сегодня</Button>
                <Button variant="outline" onClick={() => void scheduleFollowUp(2, "+2 дня")}>+2</Button>
                <Button variant="outline" onClick={() => void scheduleFollowUp(5, "+5 дней")}>+5</Button>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium text-slate-800">Шаблон WhatsApp</p>
              <Select
                value={templateDraft}
                onChange={(e) => void saveTemplate(e.target.value as MessageTemplateId)}
              >
                {MESSAGE_TEMPLATE_IDS.map((templateId) => (
                  <option key={templateId} value={templateId}>
                    {WHATSAPP_TEMPLATE_LABELS[templateId]}
                  </option>
                ))}
              </Select>
              <div className="rounded-lg bg-slate-50 p-3">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Предпросмотр</p>
                <p className="mt-1 whitespace-pre-line text-sm text-slate-700">{templateMessage}</p>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium text-slate-800">Следующее действие</p>
              <Textarea
                value={nextActionDraft}
                onChange={(e) => setNextActionDraft(e.target.value)}
                placeholder="Коротко: что делаем в следующем касании"
              />
              <Button variant="outline" onClick={() => void saveNextAction()}>Сохранить действие</Button>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium text-slate-800">Добавить касание в историю</p>
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
          <ClientTimeline events={currentClient.history} />
        </CardContent>
      </Card>
    </div>
  );
}

