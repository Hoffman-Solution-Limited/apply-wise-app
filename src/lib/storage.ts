export const RESUMES_BUCKET = (import.meta.env.VITE_SUPABASE_RESUMES_BUCKET as string | undefined)?.trim() || "resumes";

export const isBucketNotFoundError = (error: unknown) => {
  const message = String((error as { message?: string } | null)?.message ?? "").toLowerCase();
  return message.includes("bucket") && message.includes("not found");
};

export const getBucketNotFoundMessage = (bucket: string) =>
  `Storage bucket "${bucket}" was not found. Apply the Supabase migrations so uploads can work.`;
