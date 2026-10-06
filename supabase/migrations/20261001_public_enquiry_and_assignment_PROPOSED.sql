-- =====================================================================
-- EduPilot - RAPID FIX BATCH 1  --  PROPOSED, NOT APPLIED
-- =====================================================================
-- Project : edupilot-ai (iunocsnmqptjxfsemhwf)
-- Date    : 2026-10-01
-- Status  : PROPOSED ONLY. Requires explicit approval before execution.
--
-- Scope (two independent, additive changes):
--
--   ISSUE 1 - Public landing / enquiry for the `anon` role.
--     Root cause (verified live, read-only): public.institutes SELECT is
--     granted only to the `authenticated` role (policy institute_owner_select,
--     roles={authenticated}); an anon GET /rest/v1/institutes returns [] ->
--     the landing page reported "No institute is configured to receive
--     enquiries". public.enquiries INSERT is likewise {authenticated}-only, so
--     even a resolved institute could not persist an enquiry.
--
--     Fix WITHOUT weakening RLS: both tables stay closed to `anon`; two
--     SECURITY DEFINER functions are exposed instead - one returns only
--     publicly-safe institute columns, the other persists a website enquiry
--     with a server-resolved institute_id. No table-level policy is added, so
--     no other tenant row and no sensitive column becomes readable and the
--     anon role gains no table INSERT/UPDATE/DELETE rights.
--
--   ISSUE 2 - Remove a teacher assignment.
--     teacher_assignments has INSERT/SELECT/UPDATE policies but NO DELETE
--     policy for `authenticated`, so a client DELETE removes 0 rows. The
--     proposed DELETE policy restores owner/admin-only removal scoped to the
--     caller's own institute.
--
-- Idempotent: every statement is CREATE OR REPLACE / DROP ... IF EXISTS /
-- re-grant, and is safe to re-run.
-- =====================================================================

BEGIN;

-- ---------------------------------------------------------------------
-- ISSUE 1 (a) - resolve the public institute (safe columns only)
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_public_institute()
 RETURNS TABLE (
   id      uuid,
   name    text,
   phone   text,
   email   text,
   address text,
   website text
 )
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  -- The landing page is single-tenant in the current product (there is no
  -- sub-domain / slug based public routing), so the oldest institute is the
  -- one it belongs to.
  SELECT i.id, i.name, i.phone, i.email, i.address, i.website
  FROM public.institutes i
  ORDER BY i.created_at
  LIMIT 1;
$function$;

-- ---------------------------------------------------------------------
-- ISSUE 1 (b) - persist a public website enquiry
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.submit_public_enquiry(
  p_name    text,
  p_phone   text,
  p_message text DEFAULT NULL
)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_institute uuid;
  v_id        uuid;
BEGIN
  IF p_name IS NULL OR btrim(p_name) = '' OR p_phone IS NULL OR btrim(p_phone) = '' THEN
    RAISE EXCEPTION 'Name and phone number are required.';
  END IF;

  SELECT i.id INTO v_institute FROM public.institutes i ORDER BY i.created_at LIMIT 1;
  IF v_institute IS NULL THEN
    RAISE EXCEPTION 'No institute is configured to receive enquiries.';
  END IF;

  INSERT INTO public.enquiries (institute_id, student_name, phone, counselling_notes, source, status)
  VALUES (v_institute, btrim(p_name), btrim(p_phone), NULLIF(btrim(p_message), ''), 'Website', 'new')
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$function$;

-- Execute rights: public visitors + logged-in users; never PUBLIC/anon-by-default.
REVOKE ALL ON FUNCTION public.get_public_institute() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.submit_public_enquiry(text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_institute() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.submit_public_enquiry(text, text, text) TO anon, authenticated;

-- ---------------------------------------------------------------------
-- ISSUE 2 - owner/admin may DELETE a teacher assignment in their institute
-- ---------------------------------------------------------------------
DROP POLICY IF EXISTS teacher_assignments_delete ON public.teacher_assignments;
CREATE POLICY teacher_assignments_delete
  ON public.teacher_assignments
  FOR DELETE
  TO authenticated
  USING (
    institute_id = public.get_my_institute_id()
    AND public.is_owner_or_admin()
    AND public.is_active_user()
  );

COMMIT;

-- =====================================================================
-- ROLLBACK (if ever required)
-- =====================================================================
-- DROP POLICY IF EXISTS teacher_assignments_delete ON public.teacher_assignments;
-- DROP FUNCTION IF EXISTS public.submit_public_enquiry(text, text, text);
-- DROP FUNCTION IF EXISTS public.get_public_institute();
-- =====================================================================
