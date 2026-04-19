import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const upcoming = [
  {
    title: "Команда и роли",
    description:
      "Правила распределения клиентов, ответственные по умолчанию и доступ по командам.",
    eta: "Следующий этап",
  },
  {
    title: "Шаблоны WhatsApp",
    description:
      "Готовые тексты для просрочки, обратной связи по тесту и дожима по цене.",
    eta: "Запланировано",
  },
  {
    title: "Правила воронки",
    description:
      "Автонапоминания и SLA-пороги по статусам и приоритетам.",
    eta: "Запланировано",
  },
  {
    title: "Интеграции",
    description: "Экспорт данных, отчеты и внешние каналы уведомлений.",
    eta: "В работе",
  },
];

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <header>
        <h2 className="text-3xl font-semibold text-slate-900">Настройки и развитие</h2>
        <p className="mt-1.5 max-w-3xl text-sm leading-6 text-slate-600">
          Этот раздел подготовлен как следующий этап. Сейчас фокус на скорости ежедневной
          работы, а настройки усилят командный процесс после стабилизации операционки.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Что добавим дальше</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          {upcoming.map((item) => (
            <div
              key={item.title}
              className="hover-elevate rounded-xl border border-slate-200 bg-white p-4"
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
