-- ==============================================================================
-- SMART HR RESUME ANALYZER - SUPABASE POSTGRESQL SCHEMA
-- ==============================================================================
-- Run this script in the Supabase SQL Editor (Dashboard -> SQL Editor -> New query)
-- It creates all required tables, JSONB indexes, and the 'resumes' storage bucket.
-- ==============================================================================

-- 1. Enable pgcrypto extension for secure UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. USERS TABLE
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  role TEXT DEFAULT 'HR' CHECK (role IN ('Admin', 'HR')),
  is_active BOOLEAN DEFAULT TRUE,
  is_verified BOOLEAN DEFAULT TRUE,
  google_id TEXT UNIQUE,
  reset_password_token TEXT,
  reset_password_expires TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index on email for fast authentication lookups
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users (email);

-- 3. JOBS TABLE
CREATE TABLE IF NOT EXISTS public.jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  department TEXT NOT NULL,
  description TEXT NOT NULL,
  required_skills JSONB DEFAULT '[]'::jsonb,
  preferred_education TEXT,
  min_experience_years NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes on jobs
CREATE INDEX IF NOT EXISTS idx_jobs_created_by ON public.jobs (created_by);
CREATE INDEX IF NOT EXISTS idx_jobs_status ON public.jobs (status);

-- 4. CANDIDATES TABLE
CREATE TABLE IF NOT EXISTS public.candidates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  skills JSONB DEFAULT '[]'::jsonb,
  experience_years NUMERIC DEFAULT 0,
  work_experience JSONB DEFAULT '[]'::jsonb,
  education JSONB DEFAULT '[]'::jsonb,
  certifications JSONB DEFAULT '[]'::jsonb,
  projects JSONB DEFAULT '[]'::jsonb,
  resume_text TEXT,
  resume_file JSONB DEFAULT '{}'::jsonb,
  analysis JSONB DEFAULT '{}'::jsonb,
  matches JSONB DEFAULT '[]'::jsonb,
  shortlisted BOOLEAN DEFAULT FALSE,
  stage TEXT DEFAULT 'new' CHECK (stage IN ('new', 'reviewing', 'shortlisted', 'interview', 'hired', 'rejected')),
  notes JSONB DEFAULT '[]'::jsonb,
  uploaded_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes on candidates
CREATE INDEX IF NOT EXISTS idx_candidates_uploaded_by ON public.candidates (uploaded_by);
CREATE INDEX IF NOT EXISTS idx_candidates_shortlisted ON public.candidates (shortlisted);
CREATE INDEX IF NOT EXISTS idx_candidates_stage ON public.candidates (stage);
CREATE INDEX IF NOT EXISTS idx_candidates_created_at ON public.candidates (created_at DESC);

-- Enable Row Level Security (RLS) on all tables for maximum security
-- The backend uses the service_role key, which securely bypasses RLS on the server
-- while protecting sensitive tables from public internet access:
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.candidates ENABLE ROW LEVEL SECURITY;

-- 5. SUPABASE STORAGE BUCKET FOR RESUMES
-- Create the 'resumes' bucket if it doesn't already exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('resumes', 'resumes', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Storage RLS Policies
-- Allow public viewing/downloading of resume documents
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Public Access for Resumes' AND tablename = 'objects'
  ) THEN
    CREATE POLICY "Public Access for Resumes"
      ON storage.objects FOR SELECT
      USING (bucket_id = 'resumes');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Allow All Operations for Service Role' AND tablename = 'objects'
  ) THEN
    CREATE POLICY "Allow All Operations for Service Role"
      ON storage.objects FOR ALL
      TO service_role
      USING (bucket_id = 'resumes')
      WITH CHECK (bucket_id = 'resumes');
  END IF;
END $$;
