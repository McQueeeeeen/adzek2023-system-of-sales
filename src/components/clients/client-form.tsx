"use client";

import { FormEvent, useMemo, useState } from "react";
import { CLIENT_STATUSES, Client, ClientInput } from "@/types/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { STATUS_LABELS } from "@/lib/format";

type Props = {
  initialClient?: Client;
  onSubmit: (value: ClientInput) => void;
  submitLabel: string;
  mode?: "full" | "quick";
};

type FormState = ClientInput;

function toDateInput(isoString: string) {
  return new Date(isoString).toISOString().slice(0, 10);
}

function defaultNextAction(status: Client["status"]) {
  switch (status) {
    case "new":
      return "Сделать первое касание";
    case "sample":
      return "Уточнить получение пробника";
    case "waiting-test":
      return "Запросить результат теста";
    case "interested":
      return "Подтолкнуть к пробному заказу";
    case "negotiating":
      return "Согласовать условия и закрыть первый заказ";
    case "won":
      return "Развивать клиента и увеличить объем";
    case "lost":
      return "Поставить в повторный контакт";
    default:
      return "Определить следующий шаг";
  }
}

export function ClientForm({ initialClient, onSubmit, submitLabel, mode = "full" }: Props) {
  const initialState = useMemo<FormState>(
    () => ({
      companyName: initialClient?.companyName ?? "",
      name: initialClient?.name ?? "",
      whatsappNumber: initialClient?.whatsappNumber ?? "",
      email: initialClient?.email ?? "",
      city: initialClient?.city ?? "",
      segment: initialClient?.segment ?? "",
      product: initialClient?.product ?? "",
      status: initialClient?.status ?? "new",
      priority: initialClient?.priority ?? "medium",
      assignedTo: initialClient?.assignedTo ?? "Ayan",
      sampleSentDate: initialClient
        ? toDateInput(initialClient.sampleSentDate)
        : toDateInput(new Date().toISOString()),
      followUpDate: initialClient
        ? toDateInput(initialClient.followUpDate)
        : toDateInput(new Date().toISOString()),
      nextAction: initialClient?.nextAction ?? defaultNextAction(initialClient?.status ?? "new"),
      estimatedMonthlyValue: initialClient?.estimatedMonthlyValue ?? 0,
      notes: initialClient?.notes ?? "",
      lastContactAt: initialClient?.lastContactAt,
    }),
    [initialClient]
  );

  const [form, setForm] = useState<FormState>(initialState);

  const canSubmit = form.companyName.trim().length > 1 && form.whatsappNumber.trim().length > 6;

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const isQuickMode = mode === "quick";
    const normalizedName = form.name.trim();
    const normalizedEmail = form.email.trim();
    const normalizedProduct = form.product.trim();

    onSubmit({
      ...form,
      companyName: form.companyName.trim(),
      name: normalizedName.length > 0 ? normalizedName : `Контакт ${form.companyName.trim()}`,
      whatsappNumber: form.whatsappNumber.trim(),
      email:
        normalizedEmail.length > 0
          ? normalizedEmail
          : `${form.companyName
              .trim()
              .toLowerCase()
              .replace(/[^a-z0-9]+/g, ".")
              .replace(/^\.+|\.+$/g, "")}@pending.local`,
      city: form.city.trim(),
      segment: form.segment.trim(),
      notes: form.notes.trim(),
      product:
        normalizedProduct.length > 0
          ? normalizedProduct
          : isQuickMode
            ? "Базовая линейка"
            : normalizedProduct,
      nextAction:
        form.nextAction.trim().length > 0 ? form.nextAction.trim() : defaultNextAction(form.status),
      sampleSentDate: new Date(form.sampleSentDate).toISOString(),
      followUpDate: new Date(form.followUpDate).toISOString(),
      estimatedMonthlyValue: Number(form.estimatedMonthlyValue) || 0,
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-7">
      <Card>
        <CardHeader>
          <CardTitle>{mode === "quick" ? "Быстрое добавление" : "Профиль клиента"}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-5 md:grid-cols-2">
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="companyName">Компания</Label>
            <Input
              id="companyName"
              value={form.companyName}
              onChange={(e) => update("companyName", e.target.value)}
              placeholder="Например: Alem Trade Distribution"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="name">Имя контакта</Label>
            <Input
              id="name"
              value={form.name}
              onChange={(e) => update("name", e.target.value)}
              placeholder="Необязательно в быстром режиме"
              required={mode === "full"}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="whatsappNumber">Телефон WhatsApp</Label>
            <Input
              id="whatsappNumber"
              value={form.whatsappNumber}
              onChange={(e) => update("whatsappNumber", e.target.value)}
              placeholder="+7701XXXXXXX"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="product">Продукт</Label>
            <Input
              id="product"
              value={form.product}
              onChange={(e) => update("product", e.target.value)}
              placeholder={mode === "quick" ? "Необязательно (по умолчанию: Базовая линейка)" : "Ultra Degreaser"}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Эл. почта</Label>
            <Input
              id="email"
              type="email"
              value={form.email}
              onChange={(e) => update("email", e.target.value)}
              placeholder={mode === "quick" ? "Необязательно в быстром режиме" : "contact@company.com"}
              required={mode === "full"}
            />
          </div>
          {mode === "full" ? (
            <>
              <div className="space-y-2">
                <Label htmlFor="city">Город</Label>
                <Input id="city" value={form.city} onChange={(e) => update("city", e.target.value)} placeholder="Almaty" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="segment">Сегмент</Label>
                <Input id="segment" value={form.segment} onChange={(e) => update("segment", e.target.value)} placeholder="Facility Services" />
              </div>
            </>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Воронка и касания</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-5 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="status">Статус</Label>
            <Select id="status" value={form.status} onChange={(e) => update("status", e.target.value as Client["status"])}>
              {CLIENT_STATUSES.map((status) => (
                <option value={status} key={status}>
                  {STATUS_LABELS[status]}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="priority">Приоритет</Label>
            <Select id="priority" value={form.priority} onChange={(e) => update("priority", e.target.value as Client["priority"])}>
              <option value="high">Высокий</option>
              <option value="medium">Средний</option>
              <option value="low">Низкий</option>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="assignedTo">Ответственный</Label>
            <Input id="assignedTo" value={form.assignedTo} onChange={(e) => update("assignedTo", e.target.value)} placeholder="Ayan" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="sampleSentDate">Дата пробника</Label>
            <Input id="sampleSentDate" type="date" value={form.sampleSentDate} onChange={(e) => update("sampleSentDate", e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="followUpDate">Следующее касание</Label>
            <Input id="followUpDate" type="date" value={form.followUpDate} onChange={(e) => update("followUpDate", e.target.value)} />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="nextAction">Следующее действие</Label>
            <Input
              id="nextAction"
              value={form.nextAction}
              onChange={(e) => update("nextAction", e.target.value)}
              placeholder="Например: запросить результат теста"
            />
            <p className="text-xs text-slate-500">
              Один конкретный шаг, который двигает клиента вперед.
            </p>
          </div>
          {mode === "full" ? (
            <>
              <div className="space-y-2">
                <Label htmlFor="estimatedMonthlyValue">Оценка объема в месяц (USD)</Label>
                <Input
                  id="estimatedMonthlyValue"
                  type="number"
                  min={0}
                  value={form.estimatedMonthlyValue}
                  onChange={(e) => update("estimatedMonthlyValue", Number(e.target.value))}
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="notes">Комментарий</Label>
                <Textarea
                  id="notes"
                  value={form.notes}
                  onChange={(e) => update("notes", e.target.value)}
                  placeholder="Ключевые детали: возражения, интерес, следующий шаг"
                />
              </div>
            </>
          ) : (
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="notes">Комментарий (необязательно)</Label>
              <Textarea
                id="notes"
                value={form.notes}
                onChange={(e) => update("notes", e.target.value)}
                placeholder="Контекст для первого касания"
              />
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button type="submit" disabled={!canSubmit}>
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
