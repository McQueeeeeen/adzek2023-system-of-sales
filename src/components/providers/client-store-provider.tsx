"use client";

import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import {
  DbClientRow,
  mapClientInputToDbClient,
  mapDbClientToClient,
} from "@/lib/crm-mappers";
import { getDefaultTemplateId } from "@/lib/whatsapp-templates";
import { Client, ClientHistoryEvent, ClientInput } from "@/types/client";

const PAGE_SIZE = 30;

type ClientState = {
  clients: Client[];
  hydrated: boolean;
  loading: boolean;
  hasMore: boolean;
  totalCount: number;
};

type AddClientAction = {
  type: "add_client";
  payload: ClientInput;
};

type UpdateClientAction = {
  type: "update_client";
  payload: {
    id: string;
    updates: Partial<ClientInput> & Partial<Pick<Client, "messageTemplate">>;
  };
};

type AddHistoryAction = {
  type: "add_history_event";
  payload: {
    clientId: string;
    event: Omit<ClientHistoryEvent, "id" | "date"> & {
      date?: string;
    };
  };
};

type HydrateAction = {
  type: "hydrate";
  payload: Client[];
};

type ClientAction =
  | AddClientAction
  | UpdateClientAction
  | AddHistoryAction
  | HydrateAction;

type ClientStoreContextValue = {
  state: ClientState;
  dispatch: (action: ClientAction) => Promise<void>;
  reload: () => Promise<void>;
  loadMore: () => Promise<void>;
};

const ClientStoreContext = createContext<ClientStoreContextValue | null>(null);

const INITIAL_STATE: ClientState = {
  clients: [],
  hydrated: false,
  loading: true,
  hasMore: false,
  totalCount: 0,
};

function defaultNextAction(status: Client["status"]) {
  switch (status) {
    case "new":
      return "Сделать первое касание и подтвердить интерес";
    case "sample":
      return "Уточнить получение пробника и договориться о тесте";
    case "waiting-test":
      return "Запросить результат теста и барьеры к запуску";
    case "interested":
      return "Перевести интерес в пробный заказ";
    case "negotiating":
      return "Закрыть условия и подтолкнуть к первому заказу";
    case "won":
      return "Укрепить сделку и предложить расширение";
    case "lost":
      return "Запланировать повторный контакт через 30 дней";
    default:
      return "Определить следующий шаг";
  }
}

export function ClientStoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ClientState>(INITIAL_STATE);
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);

  const reload = useCallback(async () => {
    if (!supabase) {
      setState({ clients: [], hydrated: true, loading: false, hasMore: false, totalCount: 0 });
      return;
    }

    setState((prev) => ({ ...prev, loading: true }));

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setState({ clients: [], hydrated: true, loading: false, hasMore: false, totalCount: 0 });
      return;
    }

    const clientsResult = await supabase
      .from("crm_clients")
      .select("*", { count: "exact" })
      .eq("owner_id", user.id)
      .order("next_follow_up_date", { ascending: true })
      .range(0, PAGE_SIZE - 1);

    if (clientsResult.error) {
      setState((prev) => ({ ...prev, hydrated: true, loading: false }));
      return;
    }

    const clientsRows = (clientsResult.data ?? []) as DbClientRow[];
    const clients = clientsRows.map((row) => mapDbClientToClient(row, []));
    const total = clientsResult.count ?? 0;

    setState({ clients, hydrated: true, loading: false, hasMore: total > PAGE_SIZE, totalCount: total });
  }, [supabase]);

  useEffect(() => {
    if (!supabase) {
      setState({ clients: [], hydrated: true, loading: false, hasMore: false, totalCount: 0 });
      return;
    }

    let mounted = true;
    if (!mounted) return;
    void reload();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      void reload();
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [reload, supabase]);

  const dispatch = useCallback(
    async (action: ClientAction) => {
      if (!supabase) return;

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      if (action.type === "hydrate") {
        setState((prev) => ({
          ...prev,
          clients: action.payload,
          hydrated: true,
          loading: false,
        }));
        return;
      }

      if (action.type === "add_client") {
        const now = new Date().toISOString();
        const nextAction =
          action.payload.nextAction?.trim() || defaultNextAction(action.payload.status);
        const payload = mapClientInputToDbClient({
          ...action.payload,
          nextAction,
          lastContactAt: action.payload.lastContactAt ?? now,
        });

        const { data: inserted, error: insertError } = await supabase
          .from("crm_clients")
          .insert({
            owner_id: user.id,
            ...payload,
            message_template: getDefaultTemplateId(action.payload.status),
          })
          .select("id")
          .single();

        if (insertError || !inserted) return;

        await supabase.from("crm_client_activities").insert({
          owner_id: user.id,
          client_id: inserted.id,
          type: "sample_sent",
          action: "Клиент добавлен",
          result: "Воронка и первое касание инициализированы.",
          created_at: now,
        });

        await reload();
        return;
      }

      if (action.type === "update_client") {
        const updates = action.payload.updates;
        const dbUpdates: Record<string, unknown> = {};

        if (typeof updates.name === "string") dbUpdates.name = updates.name;
        if (typeof updates.companyName === "string") dbUpdates.company = updates.companyName;
        if (typeof updates.whatsappNumber === "string")
          dbUpdates.phone = updates.whatsappNumber;
        if (typeof updates.email === "string") dbUpdates.email = updates.email || null;
        if (typeof updates.city === "string") dbUpdates.city = updates.city || null;
        if (typeof updates.segment === "string") dbUpdates.segment = updates.segment || null;
        if (typeof updates.product === "string") dbUpdates.product = updates.product || null;
        if (typeof updates.status === "string") dbUpdates.status = updates.status;
        if (typeof updates.priority === "string") dbUpdates.priority = updates.priority;
        if (typeof updates.assignedTo === "string")
          dbUpdates.assigned_to = updates.assignedTo || null;
        if (typeof updates.sampleSentDate === "string")
          dbUpdates.sample_sent_date = updates.sampleSentDate.slice(0, 10);
        if (typeof updates.followUpDate === "string")
          dbUpdates.next_follow_up_date = updates.followUpDate.slice(0, 10);
        if (typeof updates.nextAction === "string")
          dbUpdates.next_action = updates.nextAction || null;
        if (typeof updates.estimatedMonthlyValue === "number")
          dbUpdates.potential_kzt = updates.estimatedMonthlyValue;
        if (typeof updates.notes === "string") dbUpdates.notes = updates.notes || null;
        if (typeof updates.lastContactAt === "string")
          dbUpdates.last_contact_at = updates.lastContactAt;
        if (typeof updates.messageTemplate === "string")
          dbUpdates.message_template = updates.messageTemplate;

        if (Object.keys(dbUpdates).length === 0) return;

        await supabase
          .from("crm_clients")
          .update(dbUpdates)
          .eq("id", action.payload.id)
          .eq("owner_id", user.id);

        await reload();
        return;
      }

      if (action.type === "add_history_event") {
        await supabase.from("crm_client_activities").insert({
          owner_id: user.id,
          client_id: action.payload.clientId,
          type: action.payload.event.type,
          action: action.payload.event.title,
          result: action.payload.event.description ?? null,
          created_at: action.payload.event.date ?? new Date().toISOString(),
        });

        await supabase
          .from("crm_clients")
          .update({
            last_contact_at: action.payload.event.date ?? new Date().toISOString(),
          })
          .eq("id", action.payload.clientId)
          .eq("owner_id", user.id);

        // Auto-advance to next follow-up step
        if (action.payload.event.type === "whatsapp_followup") {
          const { data: clientRow } = await supabase
            .from("crm_clients")
            .select("sample_sent_date")
            .eq("id", action.payload.clientId)
            .eq("owner_id", user.id)
            .single();

          if (clientRow?.sample_sent_date) {
            const STEPS = [
              { dayOffset: 2,  nextAction: "Уточнить по результату теста" },
              { dayOffset: 5,  nextAction: "Сравнить с текущим поставщиком — подвести к решению" },
              { dayOffset: 8,  nextAction: "Предложить тестовую поставку на небольшой объём" },
              { dayOffset: 10, nextAction: "Согласовать условия и зафиксировать первую поставку" },
              { dayOffset: 14, nextAction: "Закрыть цикл или запланировать повторный контакт" },
            ] as const;

            const sample = new Date(clientRow.sample_sent_date);
            const daysSince = Math.floor((Date.now() - sample.getTime()) / 86_400_000);
            const nextStep = STEPS.find((s) => s.dayOffset > daysSince);

            if (nextStep) {
              const nextDate = new Date(sample);
              nextDate.setDate(nextDate.getDate() + nextStep.dayOffset);
              await supabase
                .from("crm_clients")
                .update({
                  next_follow_up_date: nextDate.toISOString().slice(0, 10),
                  next_action: nextStep.nextAction,
                })
                .eq("id", action.payload.clientId)
                .eq("owner_id", user.id);
            }
          }
        }

        await reload();
      }
    },
    [reload, supabase]
  );

  const loadMore = useCallback(async () => {
    if (!supabase) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const offset = state.clients.length;
    const { data } = await supabase
      .from("crm_clients")
      .select("*")
      .eq("owner_id", user.id)
      .order("next_follow_up_date", { ascending: true })
      .range(offset, offset + PAGE_SIZE - 1);
    if (!data?.length) return;
    const newClients = (data as DbClientRow[]).map((row) => mapDbClientToClient(row, []));
    setState((prev) => ({
      ...prev,
      clients: [...prev.clients, ...newClients],
      hasMore: prev.clients.length + newClients.length < prev.totalCount,
    }));
  }, [supabase, state.clients.length]);

  const value = useMemo(() => ({ state, dispatch, reload, loadMore }), [state, dispatch, reload, loadMore]);

  return <ClientStoreContext.Provider value={value}>{children}</ClientStoreContext.Provider>;
}

export function useClientStore() {
  const context = useContext(ClientStoreContext);
  if (!context) {
    throw new Error("useClientStore must be used within ClientStoreProvider");
  }

  return context;
}
