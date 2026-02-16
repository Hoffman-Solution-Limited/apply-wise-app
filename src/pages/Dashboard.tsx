import { useState, useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useJobs } from "@/hooks/useJobs";
import { StatsBar } from "@/components/StatsBar";
import { JobTable } from "@/components/JobTable";
import { KanbanBoard } from "@/components/KanbanBoard";
import { JobFormDialog } from "@/components/JobFormDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Job, JobStatus, STATUS_CONFIG } from "@/lib/jobs";
import { Plus, Search, LayoutList, Columns3, LogOut, Briefcase } from "lucide-react";

const Dashboard = () => {
  const { user, signOut } = useAuth();
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

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-primary/10">
              <Briefcase className="w-4 h-4 text-primary" />
            </div>
            <span className="font-semibold text-sm">JobTracker</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground hidden sm:block">{user?.email}</span>
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
          <JobTable jobs={filtered} onEdit={handleEdit} onDelete={(id) => deleteJob.mutate(id)} />
        ) : (
          <KanbanBoard jobs={filtered} onEdit={handleEdit} />
        )}
      </main>

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
