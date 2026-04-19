"use client";

import Link from "next/link";
import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  Clock3,
  MessageCircle,
  Sparkles,
  Send,
} from "lucide-react";
import { useState } from "react";
import { useClientStore } from "@/components/providers/client-store-provider";
import { ClientStatusBadge } from "@/components/clients/client-status-badge";
import { getDashboardMetrics, getFollowUpBuckets } from "@/lib/client-selectors";
import {
  formatCurrency,
  formatDate,
  HIGH_VALUE_THRESHOLD_KZT,
  STATUS_LABELS,
} from "@/lib/format";
import { buildTemplateMessage, buildWhatsappLink } from "@/lib/whatsapp-templates";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

function FollowUpColumn({
  title,
  hint,
  tone,
  items,
}: {
  title: string;
  hint: string;
  tone: "danger" | "warning" | "neutral";
  items: ReturnType<typeof getFollowUpBuckets>["overdue"];
}) {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  function compactAction(action: string) {
    const normalized = action.trim().replace(/\s+/g, " ");
    if (normalized.length <= 88) return normalized;
    return `${normalized.slice(0, 85).trimEnd()}...`;
  }

  function getActionPrefix(status: (typeof items)[number]["status"]) {
    switch (status) {
      case "new":
        return "Сделать сейчас:";
      case "sample":
      case "waiting-test":
      case "interested":
        return "Уточнить сейчас:";
      case "negotiating":
        return "Закрыть сейчас:";
      case "won":
        return "Развить сейчас:";
      case "lost":
        return "Вернуть сейчас:";
      default:
        return "Сделать сейчас:";
    }
  }

  function getUrgencyMeta(followUpDate: string, toneType: "danger" | "warning" | "neutral") {
    const followDate = new Date(followUpDate);
    const diffDays = Math.floor(
      (startOfToday.getTime() - followDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (toneType === "danger") {
      return {
        label: diffDays > 0 ? `Просрочено ${diffDays} дн.` : "Просрочено",
        className: "bg-rose-100 text-rose-700 ring-1 ring-rose-200",
      };
    }
    if (toneType === "warning") {
      return {
        label: "На сегодня",
        className: "bg-amber-100 text-amber-700 ring-1 ring-amber-200",
      };
    }
    return {
      label: "По плану",
      className: "bg-slate-100 text-slate-700 ring-1 ring-slate-200",
    };
  }

  const toneClass =
    tone === "danger"
      ? "border-rose-200 bg-rose-50/60"
      : tone === "warning"
        ? "border-amber-200 bg-amber-50/60"
        : "border-slate-200 bg-slate-50/70";

  const emptyState =
    tone === "danger"
      ? {
          title: "Просрочек нет",
          text: "Отлично. Команда держит темп и не теряет клиентов.",
          icon: CheckCircle2,
        }
      : {
          title: "Пока пусто",
          text: "Новые задачи появятся автоматически.",
          icon: Sparkles,
        };

  return (
    <div className={`rounded-2xl border p-4 ${toneClass}`}>
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
          <p className="text-xs text-slate-600">{hint}</p>
        </div>
        <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-slate-700">
          {items.length}
        </span>
      </div>
      <div className="space-y-2">
        {items.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white/90 p-4">
            <div className="flex items-center gap-2 text-slate-700">
              <emptyState.icon className="h-4 w-4" />
              <p className="text-sm font-semibold">{emptyState.title}</p>
            </div>
            <p className="mt-1 text-xs leading-5 text-slate-500">{emptyState.text}</p>
          </div>
        ) : null}

        {items.map((client) => {
          const urgency = getUrgencyMeta(client.followUpDate, tone);
          return (
            <div key={client.id} className="hover-elevate rounded-xl border border-slate-200 bg-white p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-900">{client.name}</p>
                  <p className="truncate text-xs text-slate-600">{client.companyName}</p>
                </div>
                <ClientStatusBadge status={client.status} />
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className={`rounded-md px-2 py-1 text-[11px] font-semibold ${urgency.className}`}>
                  {urgency.label}
                </span>
                <span className="text-xs text-slate-500">
                  Следующее касание: {formatDate(client.followUpDate)}
                </span>
              </div>

              <div className="mt-3 rounded-lg border border-teal-200 bg-teal-50/70 p-3">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-teal-700">
                  Следующее действие
                </p>
                <div className="mt-1 flex items-start gap-2">
                  <span className="rounded-md bg-white px-2 py-1 text-[11px] font-semibold text-teal-700 ring-1 ring-teal-200">
                    {getActionPrefix(client.status)}
                  </span>
                  <p className="text-sm font-semibold text-slate-900">{compactAction(client.nextAction)}</p>
                </div>
              </div>

              <div className="mt-3">
                <span
                  className={`rounded-md px-2 py-1 text-[11px] font-semibold ${
                    client.estimatedMonthlyValue >= HIGH_VALUE_THRESHOLD_KZT
                      ? "bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200"
                      : "bg-slate-100 text-slate-700"
                  }`}
                >
                  Потенциал: {formatCurrency(client.estimatedMonthlyValue)}
                </span>
              </div>

              <div className="mt-4 flex items-center gap-2">
                <Button asChild size="sm">
                  <a
                    href={buildWhatsappLink(
                      client.whatsappNumber,
                      buildTemplateMessage(client.messageTemplate, {
                        name: client.name,
                        companyName: client.companyName,
                        product: client.product,
                      })
                    )}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <MessageCircle className="mr-1.5 h-4 w-4" />
                    Написать
                  </a>
                </Button>
                <Button asChild variant="outline" size="sm">
                  <Link href={`/clients/${client.id}`}>Открыть</Link>
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const {
    state: { clients, loading },
  } = useClientStore();
  const [isSendingTelegram, setIsSendingTelegram] = useState(false);
  const [telegramToast, setTelegramToast] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const metrics = getDashboardMetrics(clients);
  const buckets = getFollowUpBuckets(clients);

  const pipelineOrder: (keyof typeof STATUS_LABELS)[] = [
    "new",
    "sample",
    "waiting-test",
    "interested",
    "negotiating",
    "won",
  ];

  const stageMeta: Record<
    (typeof pipelineOrder)[number],
    { tone: string; bar: string; hint: string }
  > = {
    new: {
      tone: "bg-slate-100 text-slate-700 ring-slate-200",
      bar: "bg-slate-400",
      hint: "Новый входящий интерес",
    },
    sample: {
      tone: "bg-cyan-100 text-cyan-700 ring-cyan-200",
      bar: "bg-cyan-500",
      hint: "Отправлен пробник",
    },
    "waiting-test": {
      tone: "bg-amber-100 text-amber-700 ring-amber-200",
      bar: "bg-amber-500",
      hint: "Ожидание результата теста",
    },
    interested: {
      tone: "bg-violet-100 text-violet-700 ring-violet-200",
      bar: "bg-violet-500",
      hint: "Есть интерес к закупке",
    },
    negotiating: {
      tone: "bg-orange-100 text-orange-700 ring-orange-200",
      bar: "bg-orange-500",
      hint: "Согласование условий",
    },
    won: {
      tone: "bg-emerald-100 text-emerald-700 ring-emerald-200",
      bar: "bg-emerald-500",
      hint: "Закрытые сделки",
    },
  };

  const pipelineRows = pipelineOrder.map((status) => {
    const count = clients.filter((client) => client.status === status).length;
    return {
      status,
      count,
      ...stageMeta[status],
    };
  });
  const maxPipelineCount = Math.max(1, ...pipelineRows.map((item) => item.count));

  const dailyScenario = [
    {
      id: "01",
      title: "Закройте все просроченные касания",
      hint: "Сначала уберите риск потери клиента.",
      tone: "bg-rose-50 text-rose-700 ring-1 ring-rose-200",
    },
    {
      id: "02",
      title: "Выполните касания на сегодня",
      hint: "Держите темп и не переносите на завтра.",
      tone: "bg-amber-50 text-amber-700 ring-1 ring-amber-200",
    },
    {
      id: "03",
      title: "Обновите следующее действие по активным лидам",
      hint: "У каждого клиента должен быть четкий следующий шаг.",
      tone: "bg-cyan-50 text-cyan-700 ring-1 ring-cyan-200",
    },
    {
      id: "04",
      title: `Сконцентрируйтесь на лидах с потенциалом от ${formatCurrency(
        HIGH_VALUE_THRESHOLD_KZT
      )}`,
      hint: "Приоритет дня: сделки с высокой ценностью.",
      tone: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
    },
  ];

  async function sendTelegramDigest() {
    try {
      setIsSendingTelegram(true);
      setTelegramToast(null);

      const response = await fetch("/api/telegram/send-digest", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ clients }),
      });

      const payload = (await response.json().catch(() => null)) as
        | { ok?: boolean; error?: string }
        | null;

      if (!response.ok) {
        throw new Error(
          payload?.error?.trim() ||
            `Ошибка отправки в Telegram (HTTP ${response.status}).`
        );
      }

      setTelegramToast({
        type: "success",
        message: "Сообщение отправлено",
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Ошибка отправки Telegram-дайджеста.";
      setTelegramToast({
        type: "error",
        message,
      });
    } finally {
      setIsSendingTelegram(false);
      setTimeout(() => setTelegramToast(null), 3000);
    }
  }

  return (
    <div className="page-stack">
      {loading ? (
        <Card>
          <CardContent className="py-10 text-sm text-slate-600">
            Загружаем данные CRM...
          </CardContent>
        </Card>
      ) : null}
      <header className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="page-header">
          <h2 className="page-title">Панель управления</h2>
          <p className="page-subtitle">
            Ключевой фокус: закрыть срочные касания и продвинуть активных клиентов по воронке.
          </p>
        </div>
        <Button
          onClick={sendTelegramDigest}
          disabled={isSendingTelegram}
          className="min-w-[220px] self-start"
        >
          <Send className="mr-1.5 h-4 w-4" />
          {isSendingTelegram ? "Отправка..." : "Отправить в Telegram"}
        </Button>
      </header>

      {telegramToast ? (
        <div className="pointer-events-none fixed right-6 top-6 z-50">
          <div
            className={`rounded-lg border px-4 py-2 text-sm font-medium shadow-lg ${
              telegramToast.type === "success"
                ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                : "border-rose-200 bg-rose-50 text-rose-700"
            }`}
          >
            {telegramToast.message}
          </div>
        </div>
      ) : null}

      <Card>
        <CardHeader className="pb-4">
          <CardTitle>Кому написать сегодня</CardTitle>
          <CardDescription>Очередь действий по срочности</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 xl:grid-cols-3">
          <FollowUpColumn
            title="Просрочено"
            hint="Разобрать в первую очередь"
            tone="danger"
            items={buckets.overdue}
          />
          <FollowUpColumn
            title="На сегодня"
            hint="Сделать до конца дня"
            tone="warning"
            items={buckets.dueToday}
          />
          <FollowUpColumn
            title="Дальше по плану"
            hint="Ближайшие запланированные касания"
            tone="neutral"
            items={buckets.upcoming.slice(0, 6)}
          />
        </CardContent>
      </Card>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
        {[
          { label: "Всего клиентов", value: metrics.total.toString(), icon: CalendarClock },
          { label: "Просроченные касания", value: metrics.overdue.toString(), icon: AlertTriangle },
          { label: "Касания на сегодня", value: metrics.dueToday.toString(), icon: Clock3 },
          { label: "В переговорах", value: metrics.negotiating.toString(), icon: CalendarClock },
          { label: "Сделки", value: metrics.won.toString(), icon: CalendarClock },
          { label: "Отказы", value: metrics.lost.toString(), icon: CalendarClock },
        ].map((item) => (
          <Card key={item.label} className="hover-elevate">
            <CardHeader className="pb-2">
              <CardDescription>{item.label}</CardDescription>
            </CardHeader>
            <CardContent className="flex items-center justify-between">
              <p className="text-2xl font-semibold text-slate-900">{item.value}</p>
              <item.icon className="h-4 w-4 text-slate-400" />
            </CardContent>
          </Card>
        ))}
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Воронка по этапам</CardTitle>
            <CardDescription>Текущее распределение клиентов</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-3">
            {pipelineRows.map((item) => {
              const width = Math.max(8, Math.round((item.count / maxPipelineCount) * 100));
              return (
                <div
                  key={item.status}
                  className="hover-elevate motion-standard rounded-xl border border-slate-200 bg-gradient-to-r from-white to-slate-50/80 px-4 py-3.5 hover:border-slate-300"
                >
                  <div className="flex items-center justify-between gap-3">
                    <span
                      className={`rounded-md px-2 py-1 text-[11px] font-semibold ring-1 ${item.tone}`}
                    >
                      {STATUS_LABELS[item.status]}
                    </span>
                    <p className="text-xl font-semibold text-slate-900">{item.count}</p>
                  </div>
                  <p className="mt-2 text-xs text-slate-500">{item.hint}</p>
                  <div className="mt-3 h-1.5 w-full rounded-full bg-slate-100">
                    <div
                      className={`h-1.5 rounded-full ${item.bar}`}
                      style={{ width: `${width}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Потенциал воронки</CardTitle>
              <CardDescription>Оценка месячного объема</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-semibold text-slate-900">{formatCurrency(metrics.pipelineValue)}</p>
              <p className="mt-3 text-sm text-slate-600">
                Держите просрочку близко к нулю, чтобы не терять темп продаж.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Ежедневный сценарий</CardTitle>
              <CardDescription>Короткий цикл работы на день</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2.5">
                {dailyScenario.map((step, index) => (
                  <div
                    key={step.id}
                    className="hover-elevate motion-standard rounded-xl border border-slate-200 bg-gradient-to-r from-white to-slate-50/80 p-3.5"
                  >
                    <div className="flex items-start gap-3">
                      <span
                        className={`mt-0.5 inline-flex h-6 min-w-6 items-center justify-center rounded-md px-1.5 text-[11px] font-semibold ${step.tone}`}
                      >
                        {step.id}
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold leading-5 text-slate-900">
                          {step.title}
                        </p>
                        <p className="mt-1 text-xs leading-5 text-slate-600">{step.hint}</p>
                      </div>
                      {index === 0 ? (
                        <span className="rounded-md bg-rose-100 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-rose-700">
                          Приоритет
                        </span>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}
