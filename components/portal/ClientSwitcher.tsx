"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { switchClientAction } from "@/app/clientes/actions";
import type { Client } from "@/lib/portal/types";

export function ClientSwitcher({
  currentClient,
  availableClients,
}: {
  currentClient: Client;
  availableClients: Client[];
}) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  if (!availableClients || availableClients.length <= 1) {
    return <strong>{currentClient.name}</strong>;
  }

  return (
    <div className="pc-client-switcher">
      <select
        className="pc-client-select"
        value={currentClient.id}
        disabled={isPending}
        onChange={(e) => {
          const newClientId = e.target.value;
          startTransition(async () => {
            await switchClientAction(newClientId);
            router.refresh();
          });
        }}
        aria-label="Seleccionar empresa cliente"
      >
        {availableClients.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>
    </div>
  );
}
