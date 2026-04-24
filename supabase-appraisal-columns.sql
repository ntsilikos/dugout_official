-- Dugout Migration: Appraisal confidence tracking
-- Run this in your Supabase SQL Editor:
-- https://supabase.com/dashboard/project/ivpvvjoiqsrqpsqrfoyu/sql
--
-- Adds per-card appraisal metadata so the UI can show provenance
-- (verified / needs review / no match) instead of silently overwriting
-- estimated_value_cents with low-confidence eBay matches.

ALTER TABLE public.cards
  ADD COLUMN IF NOT EXISTS appraisal_status text
    CHECK (appraisal_status IN ('verified', 'needs_review', 'no_match')),
  ADD COLUMN IF NOT EXISTS appraisal_confidence numeric(4,3),
  ADD COLUMN IF NOT EXISTS appraisal_comp_count integer,
  ADD COLUMN IF NOT EXISTS appraisal_flag_reason text,
  ADD COLUMN IF NOT EXISTS appraisal_tier text,
  ADD COLUMN IF NOT EXISTS last_appraised_at timestamptz;

-- Index for the /inventory?flag=needs_review filter
CREATE INDEX IF NOT EXISTS cards_appraisal_status_idx
  ON public.cards (user_id, appraisal_status)
  WHERE appraisal_status IS NOT NULL;
