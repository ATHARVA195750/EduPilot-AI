-- Phase 11: preserve enquiry-to-student conversion metadata.
-- This migration intentionally does not alter existing RLS policies.

ALTER TABLE public.enquiries
  ADD COLUMN IF NOT EXISTS converted_student_id uuid,
  ADD COLUMN IF NOT EXISTS converted_at timestamptz,
  ADD COLUMN IF NOT EXISTS converted_by uuid;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'enquiries_converted_student_id_fkey'
  ) THEN
    ALTER TABLE public.enquiries
      ADD CONSTRAINT enquiries_converted_student_id_fkey
      FOREIGN KEY (converted_student_id) REFERENCES public.students(id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'enquiries_converted_by_fkey'
  ) THEN
    ALTER TABLE public.enquiries
      ADD CONSTRAINT enquiries_converted_by_fkey
      FOREIGN KEY (converted_by) REFERENCES public.profiles(id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS enquiries_converted_student_id_idx
  ON public.enquiries (converted_student_id);
