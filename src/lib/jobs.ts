import { Tables } from "@/integrations/supabase/types";

export type Job = Tables<"jobs">;
export type JobStatus = "not_submitted" | "submitted" | "interview" | "offer" | "rejected" | "closed";
export type JobPlatform = "linkedin" | "indeed" | "company" | "glassdoor" | "other";

export const STATUS_CONFIG: Record<JobStatus, { label: string; color: string; bg: string }> = {
  not_submitted: { label: "Not Submitted", color: "text-status-gray", bg: "bg-status-gray/10" },
  submitted: { label: "Submitted", color: "text-status-blue", bg: "bg-status-blue/10" },
  interview: { label: "Interview", color: "text-status-purple", bg: "bg-status-purple/10" },
  offer: { label: "Offer", color: "text-status-green", bg: "bg-status-green/10" },
  rejected: { label: "Rejected", color: "text-status-red", bg: "bg-status-red/10" },
  closed: { label: "Closed", color: "text-muted-foreground", bg: "bg-muted" },
};

export const PLATFORM_LABELS: Record<string, string> = {
  linkedin: "LinkedIn",
  indeed: "Indeed",
  company: "Company",
  glassdoor: "Glassdoor",
  other: "Other",
};

export function getDaysRemaining(deadline: string | null): number | null {
  if (!deadline) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dl = new Date(deadline);
  dl.setHours(0, 0, 0, 0);
  return Math.ceil((dl.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

export function getDeadlineColor(days: number | null): string {
  if (days === null) return "";
  if (days < 0) return "text-status-red";
  if (days <= 3) return "text-status-yellow";
  return "text-status-green";
}
