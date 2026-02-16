import { Job, STATUS_CONFIG, PLATFORM_LABELS } from "@/lib/jobs";
import { StatusBadge } from "@/components/StatusBadge";
import { DeadlineIndicator } from "@/components/DeadlineIndicator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Pencil, Trash2, ExternalLink } from "lucide-react";
import { JobStatus } from "@/lib/jobs";

type Props = {
  jobs: Job[];
  onEdit: (job: Job) => void;
  onDelete: (id: string) => void;
};

export const JobTable = ({ jobs, onEdit, onDelete }: Props) => {
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
            <TableHead className="font-semibold w-[100px]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {jobs.map((job) => (
            <TableRow key={job.id} className="group cursor-pointer" onClick={() => onEdit(job)}>
              <TableCell className="font-medium">
                <div className="flex items-center gap-2">
                  {job.company}
                  {job.link && (
                    <a href={job.link} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="text-muted-foreground hover:text-primary">
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}
                </div>
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
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); onEdit(job); }}>
                    <Pencil className="w-3.5 h-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={(e) => { e.stopPropagation(); onDelete(job.id); }}>
                    <Trash2 className="w-3.5 h-3.5" />
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
