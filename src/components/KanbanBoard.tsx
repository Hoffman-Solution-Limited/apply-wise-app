import { Job, JobStatus } from "@/lib/jobs";
import { StatusBadge } from "@/components/StatusBadge";
import { DeadlineIndicator } from "@/components/DeadlineIndicator";
import { Button } from "@/components/ui/button";
import { Pencil, Send, Trash2 } from "lucide-react";

type Props = {
  jobs: Job[];
  onEdit: (job: Job) => void;
  onSubmitApplication: (job: Job) => void;
  onDelete: (id: string) => void;
};

const COLUMNS: JobStatus[] = ["not_submitted", "submitted", "interview", "offer", "rejected", "closed"];

export const KanbanBoard = ({ jobs, onEdit, onSubmitApplication, onDelete }: Props) => {
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
                className="bg-card border border-border rounded-lg p-3 hover:border-primary/30 hover:shadow-sm transition-all animate-fade-in"
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
                <div className="flex flex-wrap items-center gap-1.5 mt-3">
                  <Button variant="ghost" size="sm" className="h-7 px-2" onClick={() => onEdit(job)}>
                    <Pencil className="w-3 h-3 mr-1" />
                    Edit
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-primary"
                    onClick={() => onSubmitApplication(job)}
                    disabled={job.status !== "not_submitted"}
                  >
                    <Send className="w-3 h-3 mr-1" />
                    Submit application
                  </Button>
                  <Button variant="ghost" size="sm" className="h-7 px-2 text-destructive" onClick={() => onDelete(job.id)}>
                    <Trash2 className="w-3 h-3 mr-1" />
                    Delete
                  </Button>
                </div>
                <div className="flex items-center gap-2 text-xs mt-2">
                  {job.submitted_cv_url ? (
                    <a
                      href={job.submitted_cv_url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-primary hover:underline"
                    >
                      View CV
                    </a>
                  ) : (
                    <span className="text-muted-foreground">No CV</span>
                  )}
                  {job.submitted_cover_letter_url && (
                    <a
                      href={job.submitted_cover_letter_url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-primary hover:underline"
                    >
                      View CL
                    </a>
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
