-- =====================================================================
-- EduPilot - Auth / Security hardening (approved F1 + F2 + prerequisites)
-- =====================================================================
-- Project : edupilot-ai (iunocsnmqptjxfsemhwf)
-- Date    : 2026-09-27
-- Scope   : 1) normalise profiles.status to the canonical 'Active'/'Inactive'
--           2) add public.is_active_user() and gate the 11 SECURITY DEFINER
--              helpers on it (Layer 1)
--           3) re-state the 9 self-service policies with the same gate
--              (Layer 2)
--           4) schema prerequisites required by admin-provision-user
--              (teachers.teacher_id_code + uniqueness)
--           5) F1/F2: admin-only profile UPDATE policy + the
--              admin_set_profile_status RPC + column-level UPDATE grants
--              so profiles.status/role/institute_id can only be changed
--              through the audited RPC.
--
-- Rationale (live findings the migration closes):
--   * profiles.status was 'active' (lowercase) for every row while
--     supabase/functions/admin-provision-user expects exactly 'Active'
--     -> the status check rejected every caller, so provisioning was
--     dead. Normalisation restores it without touching roles.
--   * authenticated held table-level UPDATE on public.profiles, so any
--     authenticated user could rewrite their own role / institute_id /
--     status directly through PostgREST (privilege escalation).
--   * is_active_user() did not exist, so deactivating a profile did not
--     revoke access to the self-service policies.
--   * teachers.teacher_id_code did not exist although the provisioning
--     Edge Function inserts/updates it -> teacher provisioning failed.
--
-- Idempotent: every statement is CREATE OR REPLACE / IF NOT EXISTS /
-- re-state (ALTER POLICY, REVOKE, GRANT, UPDATE ... WHERE) and safe to
-- re-run. Executed as one transaction: nothing is applied on failure.
-- =====================================================================

BEGIN;

-- ---------------------------------------------------------------------
-- SECTION 1 - status normalisation (must run before the gating below)
-- ---------------------------------------------------------------------
UPDATE public.profiles SET status = 'Active'   WHERE status = 'active';
UPDATE public.profiles SET status = 'Inactive' WHERE status = 'inactive';

-- Align the column default with the canonical value (live was 'active',
-- which would silently create "inactive" users under the new gate).
ALTER TABLE public.profiles ALTER COLUMN status SET DEFAULT 'Active';

-- ---------------------------------------------------------------------
-- SECTION 2 - public.is_active_user()
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_active_user()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
    SELECT EXISTS (
        SELECT 1
        FROM public.profiles
        WHERE id = auth.uid()
          AND status = 'Active'
    );
$function$;

-- ---------------------------------------------------------------------
-- SECTION 3 - Layer 1: gate the 11 SECURITY DEFINER helpers
-- (CREATE OR REPLACE keeps OIDs, so existing policy references stay intact)
-- ---------------------------------------------------------------------

-- 3.1 institute / role lookups: an inactive profile resolves to nothing
CREATE OR REPLACE FUNCTION public.get_my_institute_id()
 RETURNS uuid
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
    SELECT institute_id
    FROM public.profiles
    WHERE id = auth.uid()
      AND status = 'Active'
    LIMIT 1;
$function$;

CREATE OR REPLACE FUNCTION public.get_my_role()
 RETURNS text
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
    SELECT role
    FROM public.profiles
    WHERE id = auth.uid()
      AND status = 'Active'
    LIMIT 1;
$function$;

CREATE OR REPLACE FUNCTION public.is_owner_or_admin()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
    SELECT EXISTS (
        SELECT 1
        FROM public.profiles
        WHERE id = auth.uid()
          AND role IN ('owner', 'admin')
          AND status = 'Active'
    );
$function$;

CREATE OR REPLACE FUNCTION public.is_student()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
    SELECT EXISTS (
        SELECT 1
        FROM public.profiles
        WHERE id = auth.uid()
          AND role = 'student'
          AND status = 'Active'
    );
$function$;

CREATE OR REPLACE FUNCTION public.is_teacher()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
    SELECT EXISTS (
        SELECT 1
        FROM public.profiles
        WHERE id = auth.uid()
          AND role = 'teacher'
          AND status = 'Active'
    );
$function$;

-- 3.2 record-scoped helpers: prefix the decision with is_active_user()
CREATE OR REPLACE FUNCTION public.student_in_batch(target_batch_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
    SELECT public.is_active_user() AND (
        EXISTS (
            SELECT 1
            FROM public.students s
            JOIN public.enrollments e
                ON e.student_id = s.id
            WHERE s.user_id = auth.uid()
              AND e.batch_id = target_batch_id
              AND e.institute_id = public.get_my_institute_id()
              AND e.status = 'active'
        )
        OR EXISTS (
            SELECT 1
            FROM public.students s
            WHERE s.user_id = auth.uid()
              AND s.batch_id = target_batch_id
              AND s.institute_id = public.get_my_institute_id()
              AND s.status = 'active'
        )
    );
$function$;

CREATE OR REPLACE FUNCTION public.student_in_course(target_course_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
    SELECT public.is_active_user() AND EXISTS (
        SELECT 1
        FROM public.students s
        WHERE s.user_id = auth.uid()
          AND s.course_id = target_course_id
          AND s.institute_id = public.get_my_institute_id()
          AND s.status = 'active'
    );
$function$;

CREATE OR REPLACE FUNCTION public.student_owns_record(target_student_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
    SELECT public.is_active_user() AND EXISTS (
        SELECT 1
        FROM public.students s
        WHERE s.id = target_student_id
          AND s.user_id = auth.uid()
          AND s.institute_id = public.get_my_institute_id()
    );
$function$;

CREATE OR REPLACE FUNCTION public.teacher_assigned_to_batch(target_batch_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
    SELECT public.is_active_user() AND EXISTS (
        SELECT 1
        FROM public.teacher_assignments ta
        JOIN public.teachers t ON t.id = ta.teacher_id
        WHERE t.user_id = auth.uid()
          AND ta.batch_id = target_batch_id
          AND ta.institute_id = public.get_my_institute_id()
          AND ta.status = 'active'
    );
$function$;

CREATE OR REPLACE FUNCTION public.teacher_assigned_to_subject(target_subject_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
    SELECT public.is_active_user() AND EXISTS (
        SELECT 1
        FROM public.teacher_assignments ta
        JOIN public.teachers t ON t.id = ta.teacher_id
        WHERE t.user_id = auth.uid()
          AND ta.subject_id = target_subject_id
          AND ta.institute_id = public.get_my_institute_id()
          AND ta.status = 'active'
    );
$function$;

CREATE OR REPLACE FUNCTION public.teacher_owns_record(target_teacher_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
    SELECT public.is_active_user() AND EXISTS (
        SELECT 1
        FROM public.teachers t
        WHERE t.id = target_teacher_id
          AND t.user_id = auth.uid()
          AND t.institute_id = public.get_my_institute_id()
    );
$function$;

-- ---------------------------------------------------------------------
-- SECTION 4 - Layer 2: re-state the 9 self-service policies with the
-- same active-user gate. USING and WITH CHECK are always given
-- explicitly so the resulting expression set is deterministic.
-- ---------------------------------------------------------------------
ALTER POLICY profiles_self_select ON public.profiles
    TO authenticated
    USING (
        ((id = auth.uid() AND public.is_active_user())
         OR ((institute_id = get_my_institute_id()) AND (get_my_role() = ANY (ARRAY['owner'::text, 'admin'::text]))))
    );

ALTER POLICY profiles_owner_admin_insert ON public.profiles
    TO authenticated
    WITH CHECK (
        ((id = auth.uid() AND public.is_active_user())
         OR ((institute_id = get_my_institute_id()) AND (get_my_role() = ANY (ARRAY['owner'::text, 'admin'::text]))))
    );

ALTER POLICY profiles_self_update ON public.profiles
    TO authenticated
    USING (id = auth.uid() AND public.is_active_user())
    WITH CHECK (id = auth.uid() AND public.is_active_user());

ALTER POLICY notifications_select ON public.notifications
    TO authenticated
    USING (user_id = auth.uid() AND public.is_active_user());

ALTER POLICY notifications_update ON public.notifications
    TO authenticated
    USING (user_id = auth.uid() AND public.is_active_user())
    WITH CHECK (user_id = auth.uid() AND public.is_active_user());

ALTER POLICY institute_owner_insert ON public.institutes
    TO authenticated
    WITH CHECK (owner_user_id = auth.uid() AND public.is_active_user());

ALTER POLICY institute_owner_select ON public.institutes
    TO authenticated
    USING (
        ((owner_user_id = auth.uid() AND public.is_active_user())
         OR (id = get_my_institute_id()))
    );

ALTER POLICY institute_owner_update ON public.institutes
    TO authenticated
    USING (owner_user_id = auth.uid() AND public.is_active_user())
    WITH CHECK (owner_user_id = auth.uid() AND public.is_active_user());

ALTER POLICY teacher_assignments_select ON public.teacher_assignments
    TO authenticated
    USING (
        (((institute_id = get_my_institute_id()) AND is_owner_or_admin())
         OR (public.is_active_user()
             AND (EXISTS ( SELECT 1
                           FROM public.teachers t
                           WHERE ((t.id = teacher_assignments.teacher_id)
                                  AND (t.user_id = auth.uid()))))))
    );

-- ---------------------------------------------------------------------
-- SECTION 5 - schema prerequisites required by the provisioning function
-- ---------------------------------------------------------------------
-- supabase/functions/admin-provision-user inserts/updates
-- teachers.teacher_id_code, but the column did not exist in the live
-- schema, so teacher provisioning failed. Type mirrors
-- students.student_id_code (varchar(50)).
ALTER TABLE public.teachers ADD COLUMN IF NOT EXISTS teacher_id_code varchar(50);

CREATE UNIQUE INDEX IF NOT EXISTS teachers_teacher_id_code_key
    ON public.teachers (teacher_id_code) WHERE teacher_id_code IS NOT NULL;

-- students.student_id_code uniqueness is already enforced live by the
-- partial unique index students_student_id_code_unique (verified before
-- applying: no duplicate non-null codes), so no extra index is needed.

-- ---------------------------------------------------------------------
-- SECTION 6 - F1/F2: administrative columns are writable only through
-- the audited RPC; profiles.status is no longer directly grantable.
-- ---------------------------------------------------------------------

-- 6.1 Owner/Admin may update other profiles of their own institute
-- (row-scoped). Column scope is enforced by the grants in 6.3.
DO $do$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename  = 'profiles'
          AND policyname = 'profiles_owner_admin_update'
    ) THEN
        CREATE POLICY profiles_owner_admin_update ON public.profiles
            FOR UPDATE
            TO authenticated
            USING ((institute_id = get_my_institute_id()) AND is_owner_or_admin())
            WITH CHECK ((institute_id = get_my_institute_id()) AND is_owner_or_admin());
    END IF;
END
$do$;

-- 6.2 The only writer of profiles.status / administrative columns
CREATE OR REPLACE FUNCTION public.admin_set_profile_status(
    p_user_id uuid,
    p_status  text
)
RETURNS public.profiles
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    v_caller_id   uuid := auth.uid();
    v_caller_inst uuid;
    v_status      text := initcap(lower(p_status));
    v_target      public.profiles;
BEGIN
    IF v_caller_id IS NULL THEN
        RAISE EXCEPTION 'not authenticated';
    END IF;

    IF v_status NOT IN ('Active', 'Inactive') THEN
        RAISE EXCEPTION 'invalid status %', p_status;
    END IF;

    -- Caller must belong to an institute and be an active owner/admin
    -- (belt and braces: helper guard plus explicit is_active_user()).
    SELECT p.institute_id
      INTO v_caller_inst
      FROM public.profiles p
     WHERE p.id = v_caller_id;

    IF v_caller_inst IS NULL
       OR NOT COALESCE(public.is_owner_or_admin(), false)
       OR NOT COALESCE(public.is_active_user(), false) THEN
        RAISE EXCEPTION 'permission denied';
    END IF;

    -- Never let an admin change their own status (prevents lockout and
    -- guarantees an active owner/admin always remains to reactivate).
    IF p_user_id = v_caller_id THEN
        RAISE EXCEPTION 'cannot change own status';
    END IF;

    UPDATE public.profiles p
       SET status = v_status
     WHERE p.id = p_user_id
       AND p.institute_id = v_caller_inst   -- tenant isolation; NULL matches nothing
    RETURNING p.* INTO v_target;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'profile not found in your institute';
    END IF;

    RETURN v_target;
END;
$$;

-- 6.3 Execute rights: only authenticated end users, never anon
REVOKE ALL ON FUNCTION public.admin_set_profile_status(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_set_profile_status(uuid, text) TO authenticated;

-- 6.4 Column-level UPDATE: identity/authorisation columns become
-- unwritable by authenticated users (status/role/institute_id included)
REVOKE UPDATE ON TABLE public.profiles FROM authenticated;
REVOKE UPDATE (id, full_name, role, institute_id, created_at, email, phone, branch_id, avatar_url, status)
    ON TABLE public.profiles FROM authenticated;
GRANT UPDATE (full_name, phone) ON TABLE public.profiles TO authenticated;

-- ---------------------------------------------------------------------
-- SECTION 7 - in-transaction assertions (roll the whole script back on
-- any unexpected end state)
-- ---------------------------------------------------------------------
DO $verify$
DECLARE
    v_policies int;
BEGIN
    SELECT count(*) INTO v_policies FROM pg_policies WHERE schemaname = 'public';
    IF v_policies <> 72 THEN
        RAISE EXCEPTION 'expected 72 public policies after hardening, found %', v_policies;
    END IF;

    IF NOT has_column_privilege('authenticated', 'public.profiles', 'full_name', 'UPDATE')
       OR NOT has_column_privilege('authenticated', 'public.profiles', 'phone', 'UPDATE') THEN
        RAISE EXCEPTION 'authenticated lost UPDATE on full_name/phone';
    END IF;

    IF has_column_privilege('authenticated', 'public.profiles', 'role', 'UPDATE')
       OR has_column_privilege('authenticated', 'public.profiles', 'status', 'UPDATE')
       OR has_column_privilege('authenticated', 'public.profiles', 'institute_id', 'UPDATE') THEN
        RAISE EXCEPTION 'authenticated can still UPDATE role/status/institute_id';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
        WHERE n.nspname = 'public' AND p.proname IN ('is_active_user', 'admin_set_profile_status')
        GROUP BY n.nspname HAVING count(*) = 2
    ) THEN
        RAISE EXCEPTION 'hardening functions missing after migration';
    END IF;

    IF EXISTS (SELECT 1 FROM public.profiles WHERE status NOT IN ('Active', 'Inactive')) THEN
        RAISE EXCEPTION 'profile statuses are not normalised';
    END IF;
END
$verify$;

COMMIT;
