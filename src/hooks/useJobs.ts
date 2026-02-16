import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Job } from "@/lib/jobs";
import { useToast } from "@/hooks/use-toast";

export function useJobs() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["jobs", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("jobs")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Job[];
    },
    enabled: !!user,
  });

  const upsertJob = useMutation({
    mutationFn: async (job: Partial<Job> & { company: string; title: string }) => {
      if (!user) throw new Error("Not authenticated");

      // Smart automation
      let status = job.status || "not_submitted";
      if (job.date_submitted && status === "not_submitted") {
        status = "submitted";
      }
      if (job.deadline && status === "not_submitted") {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const dl = new Date(job.deadline);
        dl.setHours(0, 0, 0, 0);
        if (today > dl) status = "closed";
      }

      const payload = { ...job, status, user_id: user.id };

      if (job.id) {
        const { error } = await supabase.from("jobs").update(payload).eq("id", job.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("jobs").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["jobs"] });
      toast({ title: "Job saved" });
    },
    onError: (e: Error) => {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    },
  });

  const deleteJob = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("jobs").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["jobs"] });
      toast({ title: "Job deleted" });
    },
  });

  return { jobs: query.data ?? [], isLoading: query.isLoading, upsertJob, deleteJob };
}
