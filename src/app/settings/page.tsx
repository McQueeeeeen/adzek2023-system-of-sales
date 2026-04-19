import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const upcoming = [
  {
    title: "Команда и роли",
    description:
      "Права доступа, ответственные по умолчанию и распределение базы по менеджерам.",
    eta: "Следующий этап",
  },
  {
    title: "Правила воронки",
    description:
      "SLA по касаниям, контроль этапов и автоматические подсказки по просрочке.",
    eta: "Запланировано",
  },
  {
    title: "Интеграции",
    description:
      "Экспорт отчетов, дополнительные каналы уведомлений и подключение внешних источников лидов.",
    eta: "Запланировано",
  },
];

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <header>
        <h2 className="text-3xl font-semibold text-slate-900">Настройки</h2>
        <p className="mt-1.5 max-w-3xl text-sm leading-6 text-slate-600">
          Управляйте шаблонами коммуникации и будущими настройками операционной системы продаж.
        </p>
      </header>

      <Card className="border-teal-200 bg-teal-50/60">
        <CardHeader>
          <CardTitle>WhatsApp Templates</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center justify-between gap-4">
          <p className="max-w-2xl text-sm text-slate-700">
            Полноценный модуль шаблонов: категории, переменные клиента, предпросмотр и ручной
            запуск в WhatsApp из карточки клиента.
          </p>
          <Button asChild>
            <Link href="/settings/whatsapp-templates">
              Открыть модуль
              <ArrowRight className="ml-1.5 h-4 w-4" />
            </Link>
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Roadmap настроек</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          {upcoming.map((item) => (
            <div
              key={item.title}
              className="rounded-xl border border-slate-200 bg-white p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <h3 className="text-sm font-semibold text-slate-900">{item.title}</h3>
                <Badge variant="outline">{item.eta}</Badge>
              </div>
              <p className="mt-2 text-sm leading-6 text-slate-600">{item.description}</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

