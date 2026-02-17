import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Job, JobStatus, JobPlatform, STATUS_CONFIG, PLATFORM_LABELS } from "@/lib/jobs";
import { Loader2 } from "lucide-react";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  job?: Job | null;
  onSave: (job: Partial<Job> & { company: string; title: string }) => void;
  saving?: boolean;
};

const INITIAL = {
  company: "",
  title: "",
  link: "",
  platform: "other" as JobPlatform,
  description: "",
  deadline: "",
  date_submitted: "",
  status: "not_submitted" as JobStatus,
  notes: "",
  tags: [] as string[],
};

export const JobFormDialog = ({ open, onOpenChange, job, onSave, saving }: Props) => {
  const [form, setForm] = useState(INITIAL);
  const [tagInput, setTagInput] = useState("");

  useEffect(() => {
    if (job) {
      setForm({
        company: job.company,
        title: job.title,
        link: job.link || "",
        platform: (job.platform || "other") as JobPlatform,
        description: job.description || "",
        deadline: job.deadline || "",
        date_submitted: job.date_submitted || "",
        status: job.status as JobStatus,
        notes: job.notes || "",
        tags: job.tags || [],
      });
    } else {
      setForm(INITIAL);
    }
  }, [job, open]);

  const isReadOnly = job?.status === "closed";

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      ...(job?.id ? { id: job.id } : {}),
      company: form.company,
      title: form.title,
      link: form.link || null,
      platform: form.platform,
      description: form.description || null,
      deadline: form.deadline || null,
      date_submitted: form.date_submitted || null,
      status: form.status,
      notes: form.notes || null,
      tags: form.tags,
    });
  };

  const addTag = () => {
    const t = tagInput.trim();
    if (t && !form.tags.includes(t)) {
      setForm({ ...form, tags: [...form.tags, t] });
    }
    setTagInput("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{job ? "Edit Job" : "Add Job"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Company *</Label>
              <Input value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} required disabled={isReadOnly} />
            </div>
            <div className="space-y-2">
              <Label>Job Title *</Label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required disabled={isReadOnly} />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Job Link</Label>
            <Input type="url" value={form.link} onChange={(e) => setForm({ ...form, link: e.target.value })} placeholder="https://..." disabled={isReadOnly} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Platform</Label>
              <Select value={form.platform} onValueChange={(v) => setForm({ ...form, platform: v as JobPlatform })} disabled={isReadOnly}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(PLATFORM_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as JobStatus })} disabled={isReadOnly}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Deadline</Label>
              <Input type="date" value={form.deadline} onChange={(e) => setForm({ ...form, deadline: e.target.value })} disabled={isReadOnly} />
            </div>
            <div className="space-y-2">
              <Label>Date Submitted</Label>
              <Input type="date" value={form.date_submitted} onChange={(e) => setForm({ ...form, date_submitted: e.target.value })} disabled={isReadOnly} />
            </div>
          </div>


          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} disabled={isReadOnly} />
          </div>

          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} disabled={isReadOnly} />
          </div>

          <div className="space-y-2">
            <Label>Tags</Label>
            <div className="flex gap-2">
              <Input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTag(); } }}
                placeholder="Add tag..."
                disabled={isReadOnly}
              />
              <Button type="button" variant="secondary" onClick={addTag} disabled={isReadOnly}>Add</Button>
            </div>
            {form.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {form.tags.map((tag) => (
                  <span key={tag} className="inline-flex items-center gap-1 px-2 py-0.5 bg-primary/10 text-primary text-xs rounded-full">
                    {tag}
                    {!isReadOnly && (
                      <button type="button" onClick={() => setForm({ ...form, tags: form.tags.filter((t) => t !== tag) })} className="hover:text-destructive">×</button>
                    )}
                  </span>
                ))}
              </div>
            )}
          </div>

          {!isReadOnly && (
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button type="submit" disabled={saving}>
                {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {job ? "Update" : "Add Job"}
              </Button>
            </div>
          )}
        </form>
      </DialogContent>
    </Dialog>
  );
};
