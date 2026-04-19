import { ComponentProps } from "react";
import { Badge } from "@/components/ui/badge";

type Props = {
  priority: "high" | "medium" | "low";
};

const variantMap: Record<Props["priority"], ComponentProps<typeof Badge>["variant"]> =
  {
    high: "danger",
    medium: "warning",
    low: "secondary",
  };

export function ClientPriorityBadge({ priority }: Props) {
  const label =
    priority === "high" ? "Высокий" : priority === "medium" ? "Средний" : "Низкий";
  return <Badge variant={variantMap[priority]}>{label}</Badge>;
}
