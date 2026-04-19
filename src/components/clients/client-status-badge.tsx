import { ComponentProps } from "react";
import { STATUS_LABELS } from "@/lib/format";
import { ClientStatus } from "@/types/client";
import { Badge } from "@/components/ui/badge";

type Props = {
  status: ClientStatus;
};

const variantMap: Record<ClientStatus, ComponentProps<typeof Badge>["variant"]> =
  {
    new: "secondary",
    sample: "info",
    "waiting-test": "warning",
    interested: "accent",
    negotiating: "warning",
    won: "success",
    lost: "danger",
  };

export function ClientStatusBadge({ status }: Props) {
  return <Badge variant={variantMap[status]}>{STATUS_LABELS[status]}</Badge>;
}
