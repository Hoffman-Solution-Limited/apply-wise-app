-- Add fields to store the exact resume/CV and optional cover letter used on submission

ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS submitted_cv_url text,
  ADD COLUMN IF NOT EXISTS submitted_cover_letter_url text;

COMMENT ON COLUMN public.jobs.submitted_cv_url IS 'Public URL of the CV used when submitting this application';
COMMENT ON COLUMN public.jobs.submitted_cover_letter_url IS 'Public URL of the optional cover letter used when submitting this application';
