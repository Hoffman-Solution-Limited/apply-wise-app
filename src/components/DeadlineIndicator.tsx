import { getDaysRemaining, getDeadlineColor } from "@/lib/jobs";
import { cn } from "@/lib/utils";
import { Clock } from "lucide-react";

export const DeadlineIndicator = ({ deadline }: { deadline: string | null }) => {
  const days = getDaysRemaining(deadline);
  if (days === null) return <span className="text-muted-foreground text-xs">—</span>;

  const color = getDeadlineColor(days);
  const label = days < 0 ? `${Math.abs(days)}d overdue` : days === 0 ? "Today" : `${days}d left`;

  return (
    <span className={cn("inline-flex items-center gap-1 text-xs font-medium", color)}>
      <Clock className="w-3 h-3" />
      {label}
    </span>
  );
};
