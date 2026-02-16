import { Job, STATUS_CONFIG, JobStatus } from "@/lib/jobs";
import { StatusBadge } from "@/components/StatusBadge";
import { DeadlineIndicator } from "@/components/DeadlineIndicator";
import { cn } from "@/lib/utils";

type Props = {
  jobs: Job[];
  onEdit: (job: Job) => void;
};

const COLUMNS: JobStatus[] = ["not_submitted", "submitted", "interview", "offer", "rejected", "closed"];

export const KanbanBoard = ({ jobs, onEdit }: Props) => {
  const grouped = COLUMNS.reduce((acc, status) => {
    acc[status] = jobs.filter((j) => j.status === status);
    return acc;
  }, {} as Record<JobStatus, Job[]>);

  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {COLUMNS.map((status) => (
        <div key={status} className="flex-shrink-0 w-72">
          <div className="flex items-center gap-2 mb-3 px-1">
            <StatusBadge status={status} />
            <span className="text-xs text-muted-foreground font-medium">{grouped[status].length}</span>
          </div>
          <div className="space-y-2">
            {grouped[status].map((job) => (
              <div
                key={job.id}
                onClick={() => onEdit(job)}
                className="bg-card border border-border rounded-lg p-3 cursor-pointer hover:border-primary/30 hover:shadow-sm transition-all animate-fade-in"
              >
                <p className="font-medium text-sm leading-tight">{job.company}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{job.title}</p>
                <div className="flex items-center justify-between mt-3">
                  <DeadlineIndicator deadline={job.deadline} />
                  {(job.tags || []).length > 0 && (
                    <div className="flex gap-1">
                      {(job.tags || []).slice(0, 2).map((t) => (
                        <span key={t} className="px-1.5 py-0.5 text-[10px] bg-muted rounded-full text-muted-foreground">{t}</span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {grouped[status].length === 0 && (
              <div className="border border-dashed border-border rounded-lg p-6 text-center text-xs text-muted-foreground">
                No jobs
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};
