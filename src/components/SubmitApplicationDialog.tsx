import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Job } from "@/lib/jobs";
import { Loader2 } from "lucide-react";

type SubmitApplicationPayload = {
  submittedDate: string;
  cvFile: File;
  coverLetterFile: File | null;
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  job: Job | null;
  submitting?: boolean;
  onSubmit: (payload: SubmitApplicationPayload) => Promise<void> | void;
};

const getTodayInputDate = () => new Date().toISOString().slice(0, 10);

export const SubmitApplicationDialog = ({ open, onOpenChange, job, submitting = false, onSubmit }: Props) => {
  const [submittedDate, setSubmittedDate] = useState(getTodayInputDate());
  const [cvFile, setCvFile] = useState<File | null>(null);
  const [coverLetterFile, setCoverLetterFile] = useState<File | null>(null);

  useEffect(() => {
    if (!open) return;
    setSubmittedDate(job?.date_submitted ?? getTodayInputDate());
    setCvFile(null);
    setCoverLetterFile(null);
  }, [open, job?.id, job?.date_submitted]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cvFile) return;
    await onSubmit({ submittedDate, cvFile, coverLetterFile });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Submit Application</DialogTitle>
          <DialogDescription>
            Save the exact CV and optional cover letter used for this application so you can revisit them before interviews.
          </DialogDescription>
        </DialogHeader>

        {job && (
          <div className="text-sm rounded-md border bg-muted/40 px-3 py-2">
            <span className="font-medium">{job.company}</span>
            <span className="text-muted-foreground"> - {job.title}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="submitted-date">Submission date</Label>
            <Input
              id="submitted-date"
              type="date"
              value={submittedDate}
              onChange={(e) => setSubmittedDate(e.target.value)}
              required
              disabled={submitting}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="submitted-cv">CV used (required)</Label>
            <Input
              id="submitted-cv"
              type="file"
              accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              onChange={(e) => setCvFile(e.target.files?.[0] ?? null)}
              required
              disabled={submitting}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="submitted-cover">Cover letter used (optional)</Label>
            <Input
              id="submitted-cover"
              type="file"
              accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              onChange={(e) => setCoverLetterFile(e.target.files?.[0] ?? null)}
              disabled={submitting}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting || !cvFile}>
              {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Submit application
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
