-- Migration: add resume_url, experience, and education to profiles
-- Run this in Supabase (applies automatically when publishing migrations)

BEGIN;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS resume_url text,
  ADD COLUMN IF NOT EXISTS experience jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS education jsonb DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.profiles.resume_url IS 'Public URL to resume stored in Supabase Storage';
COMMENT ON COLUMN public.profiles.experience IS 'JSON array of experience objects {company,role,start,end}';
COMMENT ON COLUMN public.profiles.education IS 'JSON array of education objects {school,degree,start,end}';

COMMIT;
