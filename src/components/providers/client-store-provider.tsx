"use client";

import {
  createContext,
  Dispatch,
  ReactNode,
  useContext,
  useEffect,
  useMemo,
  useReducer,
} from "react";
import { MOCK_CLIENTS } from "@/lib/mock-data";
import { getDefaultTemplateId } from "@/lib/whatsapp-templates";
import { Client, ClientHistoryEvent, ClientInput } from "@/types/client";

const STORAGE_KEY = "adzek2023.crm.clients.v1";

type ClientState = {
  clients: Client[];
  hydrated: boolean;
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

function makeId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

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

function normalizeClient(client: Client): Client {
  return {
    ...client,
    messageTemplate: client.messageTemplate ?? getDefaultTemplateId(client.status),
    nextAction: client.nextAction?.trim() || defaultNextAction(client.status),
  };
}

function upsertUpdatedAt(client: Client): Client {
  return {
    ...client,
    updatedAt: new Date().toISOString(),
  };
}

function reducer(state: ClientState, action: ClientAction): ClientState {
  if (action.type === "hydrate") {
    return {
      clients: action.payload,
      hydrated: true,
    };
  }

  if (action.type === "add_client") {
    const now = new Date().toISOString();
    const newClient: Client = {
      id: makeId("c"),
      createdAt: now,
      updatedAt: now,
      lastContactAt: action.payload.lastContactAt ?? now,
      history: [
        {
          id: makeId("h"),
          date: now,
          type: "sample_sent",
          title: "Клиент добавлен",
          description: "Воронка и первое касание инициализированы.",
        },
      ],
      ...action.payload,
      messageTemplate: getDefaultTemplateId(action.payload.status),
      nextAction:
        action.payload.nextAction?.trim() || defaultNextAction(action.payload.status),
    };

    return {
      ...state,
      clients: [newClient, ...state.clients],
    };
  }

  if (action.type === "update_client") {
    return {
      ...state,
      clients: state.clients.map((client) => {
        if (client.id !== action.payload.id) {
          return client;
        }

        const updated = {
          ...client,
          ...action.payload.updates,
        };

        return upsertUpdatedAt(updated);
      }),
    };
  }

  if (action.type === "add_history_event") {
    return {
      ...state,
      clients: state.clients.map((client) => {
        if (client.id !== action.payload.clientId) {
          return client;
        }

        const event: ClientHistoryEvent = {
          id: makeId("h"),
          date: action.payload.event.date ?? new Date().toISOString(),
          type: action.payload.event.type,
          title: action.payload.event.title,
          description: action.payload.event.description,
        };

        return upsertUpdatedAt({
          ...client,
          lastContactAt: event.date,
          history: [event, ...client.history],
        });
      }),
    };
  }

  return state;
}

type ClientStoreContextValue = {
  state: ClientState;
  dispatch: Dispatch<ClientAction>;
};

const ClientStoreContext = createContext<ClientStoreContextValue | null>(null);

const INITIAL_STATE: ClientState = {
  clients: MOCK_CLIENTS,
  hydrated: false,
};

export function ClientStoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, INITIAL_STATE);

  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      dispatch({ type: "hydrate", payload: MOCK_CLIENTS });
      return;
    }

    try {
      const parsed = JSON.parse(raw) as Client[];
      dispatch({ type: "hydrate", payload: parsed.map(normalizeClient) });
    } catch {
      dispatch({ type: "hydrate", payload: MOCK_CLIENTS });
    }
  }, []);

  useEffect(() => {
    if (!state.hydrated) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state.clients));
  }, [state.clients, state.hydrated]);

  const value = useMemo(() => ({ state, dispatch }), [state, dispatch]);

  return <ClientStoreContext.Provider value={value}>{children}</ClientStoreContext.Provider>;
}

export function useClientStore() {
  const context = useContext(ClientStoreContext);
  if (!context) {
    throw new Error("useClientStore must be used within ClientStoreProvider");
  }

  return context;
}
