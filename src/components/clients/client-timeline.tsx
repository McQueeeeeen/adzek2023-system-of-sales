import { FlaskConical, Handshake, MessageSquare, PackageCheck, StickyNote } from "lucide-react";
import { formatDate } from "@/lib/format";
import { ClientHistoryEvent } from "@/types/client";
import { Badge } from "@/components/ui/badge";

type Props = {
  events: ClientHistoryEvent[];
};

export function ClientTimeline({ events }: Props) {
  if (!events.length) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 p-6 text-sm text-slate-500">
        История пока пустая.
      </div>
    );
  }

  const ordered = [...events].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  const typeConfigMap: Record<
    ClientHistoryEvent["type"],
    {
      label: string;
      badge: "info" | "warning" | "accent" | "success" | "secondary";
      icon: typeof PackageCheck;
      marker: string;
    }
  > = {
    sample_sent: {
      label: "Пробник отправлен",
      badge: "info",
      icon: PackageCheck,
      marker: "bg-cyan-500",
    },
    whatsapp_followup: {
      label: "Касание в WhatsApp",
      badge: "warning",
      icon: MessageSquare,
      marker: "bg-amber-500",
    },
    meeting: {
      label: "Тест / встреча",
      badge: "accent",
      icon: FlaskConical,
      marker: "bg-violet-500",
    },
    status_change: {
      label: "Переговоры / этап сделки",
      badge: "success",
      icon: Handshake,
      marker: "bg-emerald-500",
    },
    note: {
      label: "Комментарий",
      badge: "secondary",
      icon: StickyNote,
      marker: "bg-slate-500",
    },
  };

  return (
    <ol className="space-y-5">
      {ordered.map((event) => {
        const config = typeConfigMap[event.type];
        const Icon = config.icon;

        return (
          <li key={event.id} className="relative pl-8">
            <span className="absolute left-0 top-1.5 h-full w-px bg-slate-200" />
            <span
              className={`absolute -left-[4px] top-1.5 h-2.5 w-2.5 rounded-full ${config.marker}`}
            />
            <div className="hover-elevate rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="mb-1 flex items-center gap-2">
                    <Badge variant={config.badge}>{config.label}</Badge>
                    <Icon className="h-3.5 w-3.5 text-slate-500" />
                  </div>
                  <p className="mt-1 text-sm font-semibold text-slate-900">{event.title}</p>
                </div>
                <p className="text-xs font-medium text-slate-500">{formatDate(event.date)}</p>
              </div>
              {event.description ? (
                <div className="mt-2 rounded-lg bg-slate-50 p-3">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                    Результат
                  </p>
                  <p className="mt-1 text-sm leading-6 text-slate-700">{event.description}</p>
                </div>
              ) : null}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
