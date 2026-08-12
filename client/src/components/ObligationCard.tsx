import type { Obligation, ObligationStatus } from "@/types";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/utils/formatCurrency";
import { cn } from "@/lib/utils";

const statusVariant: Record<ObligationStatus, "open" | "partial" | "settled"> =
  {
    open: "open",
    partial: "partial",
    settled: "settled",
  };

interface ObligationCardProps {
  obligation: Obligation;
  contactName?: string;
  onClick?: () => void;
  showContact?: boolean;
}

export default function ObligationCard({
  obligation,
  contactName,
  onClick,
  showContact = false,
}: ObligationCardProps) {
  const directionColor =
    obligation.direction === "they_owe_me"
      ? "border-l-emerald-500"
      : "border-l-red-500";

  const Wrapper = onClick ? "button" : "div";

  return (
    <Wrapper
      type={onClick ? "button" : undefined}
      onClick={onClick}
      className={cn(
        "w-full rounded-2xl border border-gray-100 border-l-4 bg-white p-4 text-left shadow-sm md:transition-shadow md:hover:shadow-md",
        directionColor,
        onClick && "hover:bg-gray-50",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-base font-bold tracking-tight">
            {obligation.description}
          </p>
          {showContact && contactName && (
            <p className="text-sm text-muted-foreground">{contactName}</p>
          )}
          <p className="mt-1 text-sm text-muted-foreground">
            Due {obligation.dueDate}
          </p>
        </div>
        <Badge variant={statusVariant[obligation.status]}>
          {obligation.status}
        </Badge>
      </div>
      <div className="mt-3 flex items-center justify-between">
        <span
          className={cn(
            "text-sm font-medium",
            obligation.direction === "they_owe_me"
              ? "text-emerald-700"
              : "text-red-700",
          )}
        >
          {obligation.direction === "they_owe_me"
            ? "They owe me"
            : "I owe them"}
        </span>
        <span className="font-mono text-base font-semibold tabular-nums">
          {formatCurrency(obligation.remainingAmount)}
        </span>
      </div>
    </Wrapper>
  );
}
