import { Job, PLATFORM_LABELS } from "@/lib/jobs";
import { StatusBadge } from "@/components/StatusBadge";
import { DeadlineIndicator } from "@/components/DeadlineIndicator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Pencil, Trash2, Send } from "lucide-react";
import { JobStatus } from "@/lib/jobs";

type Props = {
  jobs: Job[];
  onEdit: (job: Job) => void;
  onSubmitApplication: (job: Job) => void;
  onDelete: (id: string) => void;
};

export const JobTable = ({ jobs, onEdit, onSubmitApplication, onDelete }: Props) => {
  if (jobs.length === 0) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        <p className="text-lg font-medium">No jobs yet</p>
        <p className="text-sm mt-1">Add your first job application to get started</p>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-xl border border-border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="font-semibold">Company</TableHead>
            <TableHead className="font-semibold">Role</TableHead>
            <TableHead className="font-semibold">Platform</TableHead>
            <TableHead className="font-semibold">Status</TableHead>
            <TableHead className="font-semibold">Deadline</TableHead>
            <TableHead className="font-semibold">Tags</TableHead>
            <TableHead className="font-semibold">Docs</TableHead>
            <TableHead className="font-semibold w-[260px]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {jobs.map((job) => (
            <TableRow key={job.id}>
              <TableCell className="font-medium">
                {job.company}
              </TableCell>
              <TableCell className="text-muted-foreground">{job.title}</TableCell>
              <TableCell className="text-muted-foreground text-sm">{PLATFORM_LABELS[job.platform || "other"]}</TableCell>
              <TableCell><StatusBadge status={job.status as JobStatus} /></TableCell>
              <TableCell><DeadlineIndicator deadline={job.deadline} /></TableCell>
              <TableCell>
                <div className="flex flex-wrap gap-1">
                  {(job.tags || []).slice(0, 2).map((tag) => (
                    <span key={tag} className="px-1.5 py-0.5 text-[10px] bg-muted rounded-full text-muted-foreground">{tag}</span>
                  ))}
                  {(job.tags || []).length > 2 && <span className="text-[10px] text-muted-foreground">+{(job.tags || []).length - 2}</span>}
                </div>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2 text-xs">
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
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-1.5">
                  <Button variant="ghost" size="sm" className="h-8 px-2.5" onClick={() => onEdit(job)}>
                    <Pencil className="w-3.5 h-3.5 mr-1" />
                    Edit
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 px-2.5 text-primary"
                    onClick={() => onSubmitApplication(job)}
                    disabled={job.status !== "not_submitted"}
                  >
                    <Send className="w-3.5 h-3.5 mr-1" />
                    Submit application
                  </Button>
                  <Button variant="ghost" size="sm" className="h-8 px-2.5 text-destructive" onClick={() => onDelete(job.id)}>
                    <Trash2 className="w-3.5 h-3.5 mr-1" />
                    Delete
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};
