import { useState, useMemo, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useJobs } from "@/hooks/useJobs";
import { StatsBar } from "@/components/StatsBar";
import { JobTable } from "@/components/JobTable";
import { KanbanBoard } from "@/components/KanbanBoard";
import { JobFormDialog } from "@/components/JobFormDialog";
import { SubmitApplicationDialog } from "@/components/SubmitApplicationDialog";
import { BrandLogo } from "@/components/BrandLogo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Job, STATUS_CONFIG } from "@/lib/jobs";
import { Plus, Search, LayoutList, Columns3, LogOut } from "lucide-react";
import { Link } from "react-router-dom";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { RESUMES_BUCKET, getBucketNotFoundMessage, isBucketNotFoundError } from "@/lib/storage";

const DASHBOARD_QUOTES = [
  "One quality application today is better than ten rushed ones tomorrow.",
  "Consistency compounds: every tracked application improves your next move.",
  "Keep momentum. Each follow-up and update brings you closer to the right offer.",
  "Progress in job search is built in small daily actions. Keep showing up.",
  "Track it, learn from it, and apply again. That is how offers happen.",
  "Your next opportunity might come from the application you send today.",
];

const ALLOWED_DOC_MIME_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];
const ALLOWED_DOC_EXTENSIONS = [".pdf", ".doc", ".docx"];
const MAX_DOC_SIZE = 10 * 1024 * 1024;

const Dashboard = () => {
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [initials, setInitials] = useState<string>("");
  const [fullName, setFullName] = useState<string>("Job Seeker");
  const [quoteIndex, setQuoteIndex] = useState(0);
  const [submitDialogOpen, setSubmitDialogOpen] = useState(false);
  const [submitTargetJob, setSubmitTargetJob] = useState<Job | null>(null);
  const [submittingApplication, setSubmittingApplication] = useState(false);

  useEffect(() => {
    if (!user) return;
    const loadProfile = async () => {
      try {
        const { data } = await supabase.from('profiles').select('resume_url,display_name').eq('user_id', user.id).single();
        const metadataNameRaw = (user.user_metadata as { display_name?: unknown } | null)?.display_name;
        const metadataName = typeof metadataNameRaw === "string" ? metadataNameRaw.trim() : "";
        if (data) {
          setAvatarUrl((data as any).resume_url ?? null);
          const profileNameRaw = (data as { display_name?: unknown }).display_name;
          const profileName = typeof profileNameRaw === "string" ? profileNameRaw.trim() : "";
          const name = profileName || metadataName || "Job Seeker";
          setFullName(name);
          const parts = name.split(/\s+/).filter(Boolean);
          setInitials(parts.length === 0 ? '' : parts.length === 1 ? parts[0].slice(0,2).toUpperCase() : (parts[0][0]+parts[parts.length-1][0]).toUpperCase());
        } else {
          setAvatarUrl(null);
          const name = metadataName || "Job Seeker";
          setFullName(name);
          const parts = name.split(/\s+/).filter(Boolean);
          setInitials(parts.length ? parts[0].slice(0,2).toUpperCase() : '');
        }
      } catch (err) {
        console.warn('Failed to load profile avatar', err);
      }
    };
    loadProfile();
  }, [user]);

  useEffect(() => {
    if (DASHBOARD_QUOTES.length < 2) return;
    const seed = Math.floor(Date.now() / (1000 * 60 * 60 * 24)) % DASHBOARD_QUOTES.length;
    setQuoteIndex(seed);
    const timer = window.setInterval(() => {
      setQuoteIndex((prev) => (prev + 1) % DASHBOARD_QUOTES.length);
    }, 10000);
    return () => window.clearInterval(timer);
  }, []);

  const { jobs, isLoading, upsertJob, deleteJob } = useJobs();
  const [view, setView] = useState<"table" | "kanban">("table");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingJob, setEditingJob] = useState<Job | null>(null);

  const filtered = useMemo(() => {
    let result = jobs;
    if (search) {
      const q = search.toLowerCase();
      result = result.filter((j) => j.company.toLowerCase().includes(q) || j.title.toLowerCase().includes(q));
    }
    if (statusFilter !== "all") {
      result = result.filter((j) => j.status === statusFilter);
    }
    return result;
  }, [jobs, search, statusFilter]);

  const handleEdit = (job: Job) => {
    setEditingJob(job);
    setDialogOpen(true);
  };

  const handleAdd = () => {
    setEditingJob(null);
    setDialogOpen(true);
  };

  const handleSave = (job: Partial<Job> & { company: string; title: string }) => {
    upsertJob.mutate(job, {
      onSuccess: () => setDialogOpen(false),
    });
  };

  const openSubmitApplication = (job: Job) => {
    setSubmitTargetJob(job);
    setSubmitDialogOpen(true);
  };

  const isAllowedDocument = (file: File) => {
    const fileName = file.name.toLowerCase();
    const allowedMime = ALLOWED_DOC_MIME_TYPES.includes(file.type);
    const allowedExtension = ALLOWED_DOC_EXTENSIONS.some((ext) => fileName.endsWith(ext));
    return allowedMime || allowedExtension;
  };

  const validateDocument = (file: File, label: string) => {
    if (!isAllowedDocument(file)) {
      toast({
        title: "Unsupported file",
        description: `${label} must be a PDF, DOC, or DOCX file.`,
        variant: "destructive",
      });
      return false;
    }

    if (file.size > MAX_DOC_SIZE) {
      toast({
        title: "File too large",
        description: `${label} must be smaller than 10MB.`,
        variant: "destructive",
      });
      return false;
    }

    return true;
  };

  const uploadApplicationDocument = async (jobId: string, file: File, kind: "cv" | "cover-letter") => {
    if (!user) throw new Error("Not authenticated");
    const safeName = file.name.replace(/\s+/g, "_").replace(/[^a-zA-Z0-9._-]/g, "");
    const path = `${user.id}/applications/${jobId}/${Date.now()}-${kind}-${safeName}`;

    const { error } = await supabase.storage.from(RESUMES_BUCKET).upload(path, file, {
      upsert: true,
      cacheControl: "3600",
      contentType: file.type || undefined,
    });

    if (error) throw error;

    const { data } = supabase.storage.from(RESUMES_BUCKET).getPublicUrl(path);
    return data.publicUrl;
  };

  const handleSubmitApplication = async ({
    submittedDate,
    cvFile,
    coverLetterFile,
  }: {
    submittedDate: string;
    cvFile: File;
    coverLetterFile: File | null;
  }) => {
    if (!submitTargetJob || !user) return;

    if (!validateDocument(cvFile, "CV")) return;
    if (coverLetterFile && !validateDocument(coverLetterFile, "Cover letter")) return;

    setSubmittingApplication(true);

    let cvUrl = "";
    let coverLetterUrl: string | null = null;
    try {
      cvUrl = await uploadApplicationDocument(submitTargetJob.id, cvFile, "cv");
      if (coverLetterFile) {
        coverLetterUrl = await uploadApplicationDocument(submitTargetJob.id, coverLetterFile, "cover-letter");
      }
    } catch (e: any) {
      const description = isBucketNotFoundError(e) ? getBucketNotFoundMessage(RESUMES_BUCKET) : e?.message ?? "Failed to upload your application documents.";
      toast({
        title: "Upload failed",
        description,
        variant: "destructive",
      });
      setSubmittingApplication(false);
      return;
    }

    try {
      await upsertJob.mutateAsync({
        id: submitTargetJob.id,
        company: submitTargetJob.company,
        title: submitTargetJob.title,
        status: "submitted",
        date_submitted: submittedDate,
        submitted_cv_url: cvUrl,
        submitted_cover_letter_url: coverLetterUrl,
      });
      setSubmitDialogOpen(false);
      setSubmitTargetJob(null);
    } catch {
      // useJobs handles mutation error toast
    } finally {
      setSubmittingApplication(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <Link to="/" className="flex items-center" aria-label="Go to dashboard">
            <BrandLogo size="sm" />
          </Link>
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground hidden sm:block">{fullName}</span>
            <Link to="/profile" aria-label="Profile">
              <Avatar>
                {avatarUrl ? <AvatarImage src={avatarUrl} alt="avatar" /> : <AvatarFallback>{initials}</AvatarFallback>}
              </Avatar>
            </Link>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={signOut}>
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Stats */}
        <div className="animate-fade-in">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-xl font-bold">Dashboard</h1>
              <p className="text-sm text-muted-foreground">{jobs.length} total applications</p>
              <p className="text-sm italic text-muted-foreground mt-1">"{DASHBOARD_QUOTES[quoteIndex]}"</p>
            </div>
            <Button onClick={handleAdd} size="sm">
              <Plus className="w-4 h-4 mr-1.5" />
              Add Job
            </Button>
          </div>
          <StatsBar jobs={jobs} />
        </div>

        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
          <div className="flex gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search company or role..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40 h-9">
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-1 bg-muted rounded-lg p-0.5">
            <button
              onClick={() => setView("table")}
              className={`p-1.5 rounded-md transition-colors ${view === "table" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >
              <LayoutList className="w-4 h-4" />
            </button>
            <button
              onClick={() => setView("kanban")}
              className={`p-1.5 rounded-md transition-colors ${view === "kanban" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >
              <Columns3 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : view === "table" ? (
          <JobTable
            jobs={filtered}
            onEdit={handleEdit}
            onSubmitApplication={openSubmitApplication}
            onDelete={(id) => deleteJob.mutate(id)}
          />
        ) : (
          <KanbanBoard
            jobs={filtered}
            onEdit={handleEdit}
            onSubmitApplication={openSubmitApplication}
            onDelete={(id) => deleteJob.mutate(id)}
          />
        )}
      </main>

      <SubmitApplicationDialog
        open={submitDialogOpen}
        onOpenChange={(open) => {
          setSubmitDialogOpen(open);
          if (!open) setSubmitTargetJob(null);
        }}
        job={submitTargetJob}
        submitting={submittingApplication}
        onSubmit={handleSubmitApplication}
      />

      <JobFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        job={editingJob}
        onSave={handleSave}
        saving={upsertJob.isPending}
      />
    </div>
  );
};

export default Dashboard;
