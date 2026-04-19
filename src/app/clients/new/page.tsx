"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ClientForm } from "@/components/clients/client-form";
import { useClientStore } from "@/components/providers/client-store-provider";
import { Button } from "@/components/ui/button";
import { ClientInput } from "@/types/client";

export default function NewClientPage() {
  const router = useRouter();
  const { dispatch } = useClientStore();
  const [mode, setMode] = useState<"quick" | "full">("quick");

  async function handleCreate(payload: ClientInput) {
    await dispatch({ type: "add_client", payload });
    router.push("/clients");
  }

  return (
    <div className="space-y-5">
      <header>
        <h2 className="text-2xl font-semibold text-slate-900">Новый клиент</h2>
        <p className="mt-1.5 text-sm text-slate-600">
          Быстро фиксируйте лид и сразу ставьте касание.
        </p>
        <div className="mt-4 inline-flex rounded-lg border border-slate-200 bg-white p-1">
          <Button
            type="button"
            variant={mode === "quick" ? "default" : "ghost"}
            size="sm"
            onClick={() => setMode("quick")}
          >
            Быстро
          </Button>
          <Button
            type="button"
            variant={mode === "full" ? "default" : "ghost"}
            size="sm"
            onClick={() => setMode("full")}
          >
            Полная форма
          </Button>
        </div>
      </header>
      <ClientForm onSubmit={handleCreate} submitLabel="Создать клиента" mode={mode} />
    </div>
  );
}
