"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronRight, Search } from "lucide-react";
import { ClientPriorityBadge } from "@/components/clients/client-priority-badge";
import { ClientStatusBadge } from "@/components/clients/client-status-badge";
import { useClientStore } from "@/components/providers/client-store-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { filterClients } from "@/lib/client-selectors";
import { formatDate, STATUS_LABELS } from "@/lib/format";
import { CLIENT_STATUSES, ClientStatus } from "@/types/client";

const HIGH_VALUE_THRESHOLD = 3000;

function isToday(dateString: string) {
  const date = new Date(dateString);
  const now = new Date();
  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  );
}

function isOverdue(dateString: string) {
  const date = new Date(dateString);
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return date < startOfToday;
}

export default function ClientsPage() {
  const router = useRouter();
  const {
    state: { clients },
  } = useClientStore();

  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"all" | ClientStatus>("all");
  const [todayOnly, setTodayOnly] = useState<"all" | "today">("all");

  const filtered = useMemo(() => {
    const base = filterClients(clients, query, status);
    if (todayOnly === "today") {
      return base.filter((client) => isToday(client.followUpDate));
    }
    return base;
  }, [clients, query, status, todayOnly]);

  const sorted = useMemo(
    () =>
      [...filtered].sort(
        (a, b) =>
          new Date(a.followUpDate).getTime() - new Date(b.followUpDate).getTime()
      ),
    [filtered]
  );

  return (
    <div className="page-stack">
      <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="page-title">Клиенты</h2>
          <p className="page-subtitle">
            Ежедневный список действий: кому написать, кого продвинуть, где закрыть.
          </p>
          <p className="page-caption">
            Сначала закрывайте просрочку, затем ведите лиды с высоким потенциалом к первому заказу.
          </p>
        </div>
        <Button asChild>
          <Link href="/clients/new">Добавить клиента</Link>
        </Button>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Фильтры</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-[1fr_220px_180px]">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              className="pl-9"
              placeholder="Поиск: имя, компания, продукт, ответственный"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <Select value={status} onChange={(e) => setStatus(e.target.value as "all" | ClientStatus)}>
            <option value="all">Все статусы</option>
            {CLIENT_STATUSES.map((item) => (
              <option key={item} value={item}>
                {STATUS_LABELS[item]}
              </option>
            ))}
          </Select>
          <Select value={todayOnly} onChange={(e) => setTodayOnly(e.target.value as "all" | "today")}>
            <option value="all">Все даты</option>
            <option value="today">Только на сегодня</option>
          </Select>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <Table className="[&_th]:h-auto [&_th]:px-4 [&_th]:py-3.5 [&_td]:px-4 [&_td]:py-3.5">
            <TableHeader>
              <TableRow>
                <TableHead>Имя</TableHead>
                <TableHead>Компания</TableHead>
                <TableHead>Телефон</TableHead>
                <TableHead>Продукт</TableHead>
                <TableHead>Статус</TableHead>
                <TableHead>Следующее касание</TableHead>
                <TableHead>Следующее действие</TableHead>
                <TableHead>Потенциал</TableHead>
                <TableHead>Приоритет</TableHead>
                <TableHead>Ответственный</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sorted.map((client) => {
                const overdue = isOverdue(client.followUpDate);
                const dueToday = isToday(client.followUpDate);
                const dateCellTone = overdue
                  ? "bg-rose-100 text-rose-700 ring-1 ring-rose-200"
                  : dueToday
                    ? "bg-amber-100 text-amber-700 ring-1 ring-amber-200"
                    : "bg-slate-100 text-slate-700";
                const dateLabel = overdue ? "ПРОСРОЧЕНО" : dueToday ? "СЕГОДНЯ" : "ДАЛЕЕ";
                const highValue = client.estimatedMonthlyValue >= HIGH_VALUE_THRESHOLD;

                return (
                  <TableRow
                    key={client.id}
                    className={`focus-enterprise motion-standard group cursor-pointer align-top hover:bg-slate-50/90 focus-visible:bg-slate-100/90 focus-visible:ring-2 focus-visible:ring-teal-600/35 ${
                      highValue ? "bg-emerald-50/40" : ""
                    }`}
                    onClick={() => router.push(`/clients/${client.id}`)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") router.push(`/clients/${client.id}`);
                    }}
                    tabIndex={0}
                  >
                    <TableCell className="font-semibold text-slate-900">
                      <div className="flex min-h-[46px] items-start justify-between gap-2">
                        <span>{client.name}</span>
                        <ChevronRight className="motion-standard mt-0.5 h-4 w-4 shrink-0 text-slate-300 group-hover:translate-x-0.5 group-hover:text-slate-500" />
                      </div>
                    </TableCell>
                    <TableCell className="align-top">
                      <div className="min-h-[46px] leading-6">{client.companyName}</div>
                    </TableCell>
                    <TableCell className="align-top">
                      <div className="min-h-[46px] leading-6">{client.whatsappNumber}</div>
                    </TableCell>
                    <TableCell className="align-top">
                      <div className="min-h-[46px] leading-6">{client.product}</div>
                    </TableCell>
                    <TableCell>
                      <div className="flex min-h-[46px] items-start">
                        <ClientStatusBadge status={client.status} />
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex min-h-[46px] items-start">
                        <span
                          className={`inline-flex flex-col rounded-md px-2.5 py-1.5 text-xs font-semibold ${dateCellTone}`}
                        >
                          <span className="leading-4">{dateLabel}</span>
                          <span className="mt-1 text-[11px] font-medium leading-4 opacity-80">
                            {formatDate(client.followUpDate)}
                          </span>
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="max-w-[260px]">
                      <div className="min-h-[46px]">
                        <p className="line-clamp-2 text-sm leading-5 text-slate-700">{client.nextAction}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex min-h-[46px] items-start">
                        <span
                          className={`rounded-md px-2 py-1 text-xs font-semibold ${
                            highValue
                              ? "bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200"
                              : "bg-slate-100 text-slate-700"
                          }`}
                        >
                          ${client.estimatedMonthlyValue.toLocaleString("en-US")}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex min-h-[46px] items-start">
                        <ClientPriorityBadge priority={client.priority} />
                      </div>
                    </TableCell>
                    <TableCell className="font-medium text-slate-800">
                      <div className="min-h-[46px] leading-6">{client.assignedTo}</div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
