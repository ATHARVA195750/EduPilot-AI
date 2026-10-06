-- PILOT BLOCKER CLOSURE — proposed migration v2 (NOT APPLIED — awaiting approval)
-- File: supabase/migrations/20260928_pilot_blockers_f23_f24.sql
--
-- LIVE STATE verified 2026-09-28 via pg_get_functiondef / pg_policies:
--   * F-23 v1 (reject_payment_over_due + trg_payments_overpayment_guard) IS live;
--     its definition matches the previous version of this file exactly (no drift).
--   * F-24 (teacher_can_announce_batch + announcements_teacher_assigned_batch_insert)
--     IS live and matches this file — F-24 is UNCHANGED in v2.
--   * This file supersedes only the F-23 definitions.
--
-- F-23 v2 decisions (approval round 2):
--   1. AUTHORITATIVE SOURCE = successful payment rows. Validation never reads
--      fees.paid_amount (display/report counter only: fees UI, reportService,
--      ai-insights). Kept in sync by AFTER trigger trg_payments_fee_sync.
--   2. POSITIVITY: amount > 0 for EVERY row (any fee_id, any status) — checked
--      before the fee_id/status early-returns. Table CHECK payments_amount_check
--      additionally rejects 0/negative as defence in depth.
--   3. INSTITUTE INTEGRITY: fee-linked rows require
--      payments.institute_id = fees.institute_id (checked before status early-return).
--   4. CONCURRENCY: parent-fee SELECT ... FOR UPDATE retained; each statement
--      after the lock wait takes a fresh snapshot and therefore sees the
--      winning transaction's committed payment rows.
--   5. LEDGER SYNC: delta-based AFTER trigger preserves paid_amount values that
--      were set without backing payment rows (e.g. 988777 on fee daf23d36).
--
-- PENDING REPO CHANGE (after SQL approval): src/services/paymentService.js —
--   remove the client-side overpayment pre-check and the post-insert fee-ledger
--   update (the DB trigger becomes the single, atomic writer).
--
-- ROLLBACK: see commented ROLLBACK section at the end of this file.

-- ============ F-23 (v2) ============
CREATE OR REPLACE FUNCTION public.reject_payment_over_due()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_total numeric;
  v_discount numeric;
  v_fee_institute uuid;
  v_collected numeric;
  v_remaining numeric;
BEGIN
  -- (2) Universal positivity — checked BEFORE any early return so that
  --     fee_id NULL and non-'success' rows cannot bypass it.
  IF NEW.amount IS NULL OR NEW.amount <= 0 THEN
    RAISE EXCEPTION 'Payment amount must be positive (got %)', NEW.amount
      USING ERRCODE = 'check_violation';
  END IF;

  -- Offline / unlinked payments: no fee balance to validate against.
  IF NEW.fee_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- (4) Lock the parent fee: serialises concurrent payments on this fee.
  -- (3) Institute integrity: payment must belong to the fee's institute.
  SELECT f.total_amount, COALESCE(f.discount_amount, 0), f.institute_id
    INTO v_total, v_discount, v_fee_institute
    FROM public.fees f
   WHERE f.id = NEW.fee_id
   FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Linked fee % does not exist', NEW.fee_id
      USING ERRCODE = 'foreign_key_violation';
  END IF;
  IF NEW.institute_id IS DISTINCT FROM v_fee_institute THEN
    RAISE EXCEPTION 'Payment institute % does not match linked fee institute %',
      NEW.institute_id, v_fee_institute
      USING ERRCODE = 'check_violation';
  END IF;

  -- Non-'success' rows never consume the balance (by design), but they have
  -- already passed positivity + institute integrity above.
  IF NEW.status IS NOT NULL AND lower(NEW.status) <> 'success' THEN
    RETURN NEW;
  END IF;

  -- (1) Authoritative source: sum of OTHER successful payment rows.
  --     fees.paid_amount is deliberately NOT read here.
  SELECT COALESCE(SUM(p.amount), 0)
    INTO v_collected
    FROM public.payments p
   WHERE p.fee_id = NEW.fee_id
     AND (p.status IS NULL OR lower(p.status) = 'success')
     AND (TG_OP = 'INSERT' OR p.id <> NEW.id);

  v_remaining := GREATEST(0, COALESCE(v_total, 0) - COALESCE(v_discount, 0) - v_collected);
  IF NEW.amount > v_remaining THEN
    RAISE EXCEPTION 'Payment of % exceeds the remaining fee balance of %',
      NEW.amount, v_remaining
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_payments_overpayment_guard ON public.payments;
CREATE TRIGGER trg_payments_overpayment_guard
  BEFORE INSERT OR UPDATE OF amount, fee_id, status, institute_id ON public.payments
  FOR EACH ROW
  EXECUTE FUNCTION public.reject_payment_over_due();

-- Fee-ledger synchronisation (decision: payment rows are authoritative, but
-- fees.paid_amount must never go silently stale). Delta-based so fee rows whose
-- paid_amount was set without backing payment rows keep their value intact.
CREATE OR REPLACE FUNCTION public.apply_fee_paid_delta(p_fee_id uuid, p_delta numeric)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_total numeric;
  v_discount numeric;
  v_paid numeric;
  v_due numeric;
BEGIN
  IF p_fee_id IS NULL OR COALESCE(p_delta, 0) = 0 THEN
    RETURN;
  END IF;
  SELECT COALESCE(f.total_amount, 0), COALESCE(f.discount_amount, 0), COALESCE(f.paid_amount, 0)
    INTO v_total, v_discount, v_paid
    FROM public.fees f
   WHERE f.id = p_fee_id
   FOR UPDATE;
  IF NOT FOUND THEN
    RETURN; -- fee deleted concurrently (payments.fee_id is ON DELETE SET NULL)
  END IF;
  v_paid := GREATEST(0, v_paid + p_delta);
  v_due := GREATEST(0, v_total - v_discount - v_paid);
  UPDATE public.fees f
     SET paid_amount = v_paid,
         due_amount = v_due,
         payment_status = CASE WHEN v_due = 0 THEN 'paid'
                               WHEN v_paid > 0 THEN 'partial'
                               ELSE 'pending' END
   WHERE f.id = p_fee_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.sync_fee_from_payment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_old_fee uuid := NULL;
  v_new_fee uuid := NULL;
  v_old_amount numeric := 0;
  v_new_amount numeric := 0;
BEGIN
  IF TG_OP IN ('UPDATE', 'DELETE') THEN
    v_old_fee := OLD.fee_id;
    IF OLD.status IS NULL OR lower(OLD.status) = 'success' THEN
      v_old_amount := COALESCE(OLD.amount, 0);
    END IF;
  END IF;
  IF TG_OP IN ('UPDATE', 'INSERT') THEN
    v_new_fee := NEW.fee_id;
    IF NEW.status IS NULL OR lower(NEW.status) = 'success' THEN
      v_new_amount := COALESCE(NEW.amount, 0);
    END IF;
  END IF;

  IF v_old_fee IS NOT NULL AND v_new_fee IS NOT NULL AND v_old_fee = v_new_fee THEN
    PERFORM public.apply_fee_paid_delta(v_old_fee, v_new_amount - v_old_amount);
  ELSE
    IF v_old_fee IS NOT NULL THEN
      PERFORM public.apply_fee_paid_delta(v_old_fee, -v_old_amount);
    END IF;
    IF v_new_fee IS NOT NULL THEN
      PERFORM public.apply_fee_paid_delta(v_new_fee, v_new_amount);
    END IF;
  END IF;
  RETURN NULL;
END;
$function$;

DROP TRIGGER IF EXISTS trg_payments_fee_sync ON public.payments;
CREATE TRIGGER trg_payments_fee_sync
  AFTER INSERT OR UPDATE OR DELETE ON public.payments
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_fee_from_payment();

-- ============ F-24 (UNCHANGED — already live, matches this file) ============
-- Teachers may insert announcements ONLY when batch_id IS NOT NULL,
-- target_role = 'student', and they hold an active assignment to that batch
-- (public.teacher_assigned_to_batch). Teachers may NOT insert institute-wide
-- rows (batch_id NULL) — owner/admin only. Owner/admin/student behavior is
-- unchanged. Notifications (per-student rows) are intentionally NOT opened to
-- teachers; the per-recipient path stays blocked until separately approved.
-- Rollback: DROP POLICY announcements_teacher_assigned_batch_insert ON public.announcements;
--            DROP FUNCTION public.teacher_can_announce_batch(uuid);
CREATE OR REPLACE FUNCTION public.teacher_can_announce_batch(target_batch_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $function$
  SELECT public.is_active_user()
     AND public.is_teacher()
     AND target_batch_id IS NOT NULL
     AND public.teacher_assigned_to_batch(target_batch_id);
$function$;

DROP POLICY IF EXISTS announcements_teacher_assigned_batch_insert ON public.announcements;
CREATE POLICY announcements_teacher_assigned_batch_insert
  ON public.announcements
  FOR INSERT
  TO authenticated
  WITH CHECK (
    institute_id = public.get_my_institute_id()
    AND batch_id IS NOT NULL
    AND target_role = 'student'
    AND public.teacher_can_announce_batch(batch_id)
  );

-- ============ ROLLBACK (run ONLY on explicit approval) ============
-- NOTE: rolling back the DB must be paired with reverting the
--       src/services/paymentService.js change (re-introducing its
--       client-side fee-ledger update), otherwise paid_amount stops
--       being maintained at all. To restore F-23 v1 instead of removing
--       it entirely, re-apply the previous version of this file from git.
--
-- DROP TRIGGER IF EXISTS trg_payments_fee_sync ON public.payments;
-- DROP FUNCTION IF EXISTS public.sync_fee_from_payment();
-- DROP FUNCTION IF EXISTS public.apply_fee_paid_delta(uuid, numeric);
-- DROP TRIGGER IF EXISTS trg_payments_overpayment_guard ON public.payments;
-- DROP FUNCTION IF EXISTS public.reject_payment_over_due();
-- -- F-24 (only if F-24 rollback is separately approved):
-- DROP POLICY IF EXISTS announcements_teacher_assigned_batch_insert ON public.announcements;
-- DROP FUNCTION IF EXISTS public.teacher_can_announce_batch(uuid);
