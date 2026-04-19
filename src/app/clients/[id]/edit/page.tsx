"use client";

import { useParams, useRouter } from "next/navigation";
import { useMemo } from "react";
import { ClientForm } from "@/components/clients/client-form";
import { useClientStore } from "@/components/providers/client-store-provider";
import { Card, CardContent } from "@/components/ui/card";
import { getClientById } from "@/lib/client-selectors";
import { ClientInput } from "@/types/client";

export default function EditClientPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { state, dispatch } = useClientStore();

  const client = useMemo(() => getClientById(state.clients, id), [state.clients, id]);

  function handleSave(payload: ClientInput) {
    dispatch({
      type: "update_client",
      payload: {
        id,
        updates: payload,
      },
    });

    dispatch({
      type: "add_history_event",
      payload: {
        clientId: id,
        event: {
          type: "note",
          title: "Карточка обновлена",
          description: "Поля профиля и воронки изменены.",
        },
      },
    });

    router.push(`/clients/${id}`);
  }

  if (!client) {
    return (
      <Card>
        <CardContent className="pt-6 text-sm text-slate-600">
          Клиент не найден.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <header>
        <h2 className="text-2xl font-semibold text-slate-900">Редактировать клиента</h2>
        <p className="mt-1 text-sm text-slate-600">
          Обновите данные, чтобы клиент не выпадал из воронки.
        </p>
      </header>
      <ClientForm
        initialClient={client}
        onSubmit={handleSave}
        submitLabel="Сохранить изменения"
      />
    </div>
  );
}
