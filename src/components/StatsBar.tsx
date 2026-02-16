import { Job, STATUS_CONFIG, JobStatus } from "@/lib/jobs";
import { Briefcase, Send, Users, Trophy, XCircle, Archive } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = { jobs: Job[] };

const STAT_ITEMS: { status: JobStatus; icon: typeof Briefcase; accent: string }[] = [
  { status: "not_submitted", icon: Briefcase, accent: "text-status-gray" },
  { status: "submitted", icon: Send, accent: "text-status-blue" },
  { status: "interview", icon: Users, accent: "text-status-purple" },
  { status: "offer", icon: Trophy, accent: "text-status-green" },
  { status: "rejected", icon: XCircle, accent: "text-status-red" },
  { status: "closed", icon: Archive, accent: "text-muted-foreground" },
];

export const StatsBar = ({ jobs }: Props) => {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
      {STAT_ITEMS.map(({ status, icon: Icon, accent }) => {
        const count = jobs.filter((j) => j.status === status).length;
        return (
          <div key={status} className="bg-card rounded-xl border border-border p-4 flex items-center gap-3">
            <div className={cn("p-2 rounded-lg", STATUS_CONFIG[status].bg)}>
              <Icon className={cn("w-4 h-4", accent)} />
            </div>
            <div>
              <p className="text-2xl font-bold leading-none">{count}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{STATUS_CONFIG[status].label}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
};
