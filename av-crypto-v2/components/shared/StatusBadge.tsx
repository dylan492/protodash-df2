import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface StatusBadgeProps {
  status: string;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const statusLower = status.toLowerCase();

  const statusClasses: Record<string, string> = {
    approved: "status-badge-approved",
    draft: "status-badge-draft",
    executed: "status-badge-executed",
    pending: "status-badge-pending",
    complete: "status-badge-complete",
  };

  const badgeClass = statusClasses[statusLower] || "";

  return (
    <span className={cn("status-badge", badgeClass, className)}>{status}</span>
  );
}

interface CustodianBadgeProps {
  custodian: string;
  className?: string;
}

export function CustodianBadge({ custodian, className }: CustodianBadgeProps) {
  return (
    <span className={cn("custodian-badge", className)}>{custodian}</span>
  );
}

interface TypeBadgeProps {
  type: string;
  className?: string;
}

export function TypeBadge({ type, className }: TypeBadgeProps) {
  const typeColors: Record<string, string> = {
    trade: "bg-primary/10 text-primary border-primary/20",
    transfer: "bg-accent/10 text-accent border-accent/20",
    reward: "bg-success/10 text-success border-success/20",
  };

  const typeClass = typeColors[type.toLowerCase()] || "bg-muted text-muted-foreground";

  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border",
        typeClass,
        className
      )}
    >
      {type}
    </span>
  );
}
