import { STATUS_CONFIG, JobStatus } from "@/lib/jobs";
import { cn } from "@/lib/utils";

export const StatusBadge = ({ status }: { status: JobStatus }) => {
  const config = STATUS_CONFIG[status];
  return (
    <span className={cn("status-badge", config.bg, config.color)}>
      <span className={cn("w-1.5 h-1.5 rounded-full", config.color.replace("text-", "bg-"))} />
      {config.label}
    </span>
  );
};
