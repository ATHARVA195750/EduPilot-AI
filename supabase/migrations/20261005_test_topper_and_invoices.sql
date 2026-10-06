-- ============================================================================
-- BATCH 5 - REVISION 4, FINAL (PROPOSED - NOT APPLIED)
--   1. Test-topper achievement announcements (stable test <-> announcement link;
--      owner/admin only, per approved Option B)
--   2. Automatic fee invoices generated from successful payments
--
-- Safety notes:
--   * Additive only. No existing table/column is dropped or retyped.
--   * No existing RLS policy is modified or dropped.
--   * No financial calculation is altered. apply_fee_paid_delta() and
--     sync_fee_from_payment() remain the only writers of fees.paid_amount,
--     fees.due_amount and fees.payment_status.
--
-- Revision 3 (final, Option B) changes vs revision 1, all found in
-- pre-migration review:
--   R1  Teacher re-publish. A teacher upserting the topper was refused: the
--       existing announcements_update policy is owner/admin only, AND
--       PostgreSQL cannot UPDATE a row the role cannot SELECT, while
--       announcements_select exposes only target_role NULL/'teacher'/'all'
--       to teachers. RESOLVED BY OPTION B: NO teacher policy is added here.
--       announcements RLS is left completely untouched, so the F-24 read and
--       write boundaries are byte-for-byte preserved. Topper generation is
--       gated in the application to owner/admin only (topperService.js), and a
--       teacher publish reports that owner/admin publishing is required rather
--       than silently failing or claiming an announcement was created.
--   R2  invoices.payment_id was ON DELETE CASCADE, which would have DESTROYED
--       an issued invoice if its payment row was deleted.
--       -> ON DELETE RESTRICT: an invoiced payment cannot be deleted, so the
--          issued document survives. Reversal is expressed through
--          payments.status, which marks the invoice instead of erasing it.
--   R3  The new SECURITY DEFINER functions defaulted to EXECUTE for PUBLIC, so
--       any logged-in (or anon) role could call next_invoice_number() and burn
--       or probe invoice numbers. -> explicit REVOKE.
--   R4  previous_due/remaining_due were read from fees.due_amount, which is
--       correct only if trg_payments_fee_sync happens to run first. That
--       ordering is alphabetical, not a contract. -> now derived from the
--       payments ledger, so the result is independent of trigger order.
--   R5  An invoice's financial columns were editable by any owner/admin.
--       -> trg_invoices_immutable blocks changes; only `status` may change.
--   R6  A payment whose status became 'failed' left its invoice marked 'paid'.
--       -> now mapped to 'void'.
--   R7  A payment with no linked fee produced misleading 0.00 due figures.
--       -> fee-derived columns are NULL (unknown) instead of fabricated.
--   R8  A payment recorded 'pending' and later confirmed 'success' produced NO
--       invoice at all. -> ensure_invoice_for_payment() is called from BOTH the
--       INSERT and the status-UPDATE trigger.
--   R9  A NULL batch_id would silently defeat the partial unique index
--       (Postgres treats NULLs as distinct). -> CHECK constraint.
--   R10 invoices.status was directly writable by any client holding the
--       owner/admin UPDATE policy, so a paid invoice could be marked 'void' or
--       a refunded one flipped back to 'paid' without touching the payment.
--       -> protect_invoice_snapshot() now accepts a status change only when it
--          equals the value implied by the linked payment's current status.
--   R11 payments.status could be moved arbitrarily (e.g. refunded -> success),
--       and the invoice would faithfully follow, re-presenting a returned
--       payment as collected. -> enforce_payment_status_transition() restricts
--       the payment to legitimate lifecycle edges; failed/refunded/cancelled
--       are terminal.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1a. Stable association between an achievement announcement and its test.
-- ---------------------------------------------------------------------------
ALTER TABLE public.announcements
  ADD COLUMN IF NOT EXISTS test_id uuid REFERENCES public.tests(id) ON DELETE CASCADE;

-- Must be a FULL unique index, not a partial one. A partial index cannot be
-- inferred as an ON CONFLICT conflict target, which made the application's
-- upsert(..., { onConflict: 'test_id,batch_id' }) fail with SQLSTATE 42P10.
-- Corrected by patch 20261005_1_fix_announcements_test_index.sql.
CREATE UNIQUE INDEX IF NOT EXISTS announcements_test_batch_uniq
  ON public.announcements (test_id, batch_id);

-- Structural guarantee behind the scoping rule: any test-linked announcement
-- MUST be batch-scoped, so a duplicate can never hide behind a NULL batch_id
-- (Postgres treats NULLs as distinct in a unique index).
ALTER TABLE public.announcements
  DROP CONSTRAINT IF EXISTS announcements_test_requires_batch;
ALTER TABLE public.announcements
  ADD CONSTRAINT announcements_test_requires_batch
  CHECK (test_id IS NULL OR batch_id IS NOT NULL);

COMMENT ON COLUMN public.announcements.test_id IS
  'Test this achievement announcement belongs to. NULL for ordinary announcements. One topper announcement per (test_id, batch_id) is enforced by announcements_test_batch_uniq.';

-- ---------------------------------------------------------------------------
-- 1b. GSTIN is optional institute data; rendered on an invoice only if set.
-- ---------------------------------------------------------------------------
ALTER TABLE public.institutes
  ADD COLUMN IF NOT EXISTS gstin text;

-- ---------------------------------------------------------------------------
-- 2a. Invoice numbering: institute-scoped, monotonic, concurrency safe.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.invoice_counters (
  institute_id uuid NOT NULL REFERENCES public.institutes(id) ON DELETE CASCADE,
  fiscal_year   int    NOT NULL,
  last_value    bigint NOT NULL DEFAULT 0,
  PRIMARY KEY (institute_id, fiscal_year)
);

ALTER TABLE public.invoice_counters ENABLE ROW LEVEL SECURITY;
-- No client policies: these rows are only reachable through the
-- SECURITY DEFINER allocator below, which itself is REVOKEd from PUBLIC (R3).

-- ---------------------------------------------------------------------------
-- 2b. The invoice itself: a historical, append-only snapshot.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.invoices (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institute_id     uuid NOT NULL REFERENCES public.institutes(id) ON DELETE CASCADE,
  -- R2: RESTRICT, not CASCADE. A payment that has been invoiced cannot be
  -- deleted, so the issued financial document can never be destroyed by a
  -- cascading delete. Reversal is expressed through payments.status and
  -- invoices.status, which preserves the original document and amounts.
  payment_id       uuid NOT NULL UNIQUE REFERENCES public.payments(id) ON DELETE RESTRICT,
  invoice_number   text NOT NULL,
  status           text NOT NULL DEFAULT 'paid',

  -- payment snapshot
  payment_date       date,
  payment_method     text,
  reference_number   text,
  receipt_number     text,
  amount_paid        numeric(12,2) NOT NULL CHECK (amount_paid > 0),
  fee_total          numeric(12,2),
  previous_due       numeric(12,2),
  remaining_due      numeric(12,2),

  -- student snapshot
  student_id      uuid,
  student_name    text,
  student_code    text,
  batch_name      text,
  course_name     text,

  -- institute snapshot
  institute_name    text,
  institute_address text,
  institute_phone   text,
  institute_email   text,
  institute_gstin   text,
  institute_logo    text,

  created_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT invoices_institute_number_uniq UNIQUE (institute_id, invoice_number),
  CONSTRAINT invoices_status_check CHECK (status IN ('paid', 'refunded', 'void'))
);

ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS invoices_institute_idx ON public.invoices (institute_id);
CREATE INDEX IF NOT EXISTS invoices_student_idx   ON public.invoices (student_id);

-- Owner/Admin: visibility within their own institute only.
CREATE POLICY invoices_select_admin ON public.invoices
  FOR SELECT USING (institute_id = get_my_institute_id() AND is_owner_or_admin());

CREATE POLICY invoices_update_admin ON public.invoices
  FOR UPDATE USING (institute_id = get_my_institute_id() AND is_owner_or_admin())
  WITH CHECK (institute_id = get_my_institute_id());

-- Students may read ONLY their own invoices. student_owns_record() binds the
-- row to auth.uid() and to the caller's institute.
CREATE POLICY invoices_select_own_student ON public.invoices
  FOR SELECT USING (institute_id = get_my_institute_id() AND student_owns_record(student_id));

-- No INSERT policy and no DELETE policy, on purpose:
--   * invoices are created only by the SECURITY DEFINER trigger below, so a
--     browser cannot forge an invoice;
--   * invoices can never be deleted, so they stay historical records.
-- Teachers receive no policy at all, so invoice access is denied by default.

-- ---------------------------------------------------------------------------
-- 2c. Invoice immutability and status integrity (R5, R10).
--
-- RLS controls WHO may write a row, not WHICH columns. Two separate risks:
--
--   (a) The owner/admin UPDATE policy would let anyone silently rewrite
--       amount_paid or the student snapshot on an already-issued invoice. Every
--       snapshot column is therefore frozen.
--
--   (b) Leaving `status` writable would let any client - including an owner or
--       admin - mark a genuinely paid invoice as 'void', or flip a refunded one
--       back to 'paid', falsifying the financial record without touching the
--       payment at all. A status change is therefore only accepted when it is
--       exactly what the linked payment's current status implies. The payment is
--       the single source of truth; the invoice mirrors it.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.protect_invoice_snapshot()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_payment_status text;
  v_expected       text;
BEGIN
  IF NEW.invoice_number   IS DISTINCT FROM OLD.invoice_number
     OR NEW.institute_id  IS DISTINCT FROM OLD.institute_id
     OR NEW.payment_id    IS DISTINCT FROM OLD.payment_id
     OR NEW.amount_paid   IS DISTINCT FROM OLD.amount_paid
     OR NEW.fee_total     IS DISTINCT FROM OLD.fee_total
     OR NEW.previous_due  IS DISTINCT FROM OLD.previous_due
     OR NEW.remaining_due IS DISTINCT FROM OLD.remaining_due
     OR NEW.payment_date  IS DISTINCT FROM OLD.payment_date
     OR NEW.payment_method IS DISTINCT FROM OLD.payment_method
     OR NEW.reference_number IS DISTINCT FROM OLD.reference_number
     OR NEW.receipt_number IS DISTINCT FROM OLD.receipt_number
     OR NEW.student_id    IS DISTINCT FROM OLD.student_id
     OR NEW.student_name  IS DISTINCT FROM OLD.student_name
     OR NEW.student_code  IS DISTINCT FROM OLD.student_code
     OR NEW.batch_name    IS DISTINCT FROM OLD.batch_name
     OR NEW.course_name   IS DISTINCT FROM OLD.course_name
     OR NEW.institute_name    IS DISTINCT FROM OLD.institute_name
     OR NEW.institute_address IS DISTINCT FROM OLD.institute_address
     OR NEW.institute_phone   IS DISTINCT FROM OLD.institute_phone
     OR NEW.institute_email   IS DISTINCT FROM OLD.institute_email
     OR NEW.institute_gstin   IS DISTINCT FROM OLD.institute_gstin
     OR NEW.institute_logo    IS DISTINCT FROM OLD.institute_logo
     OR NEW.created_at    IS DISTINCT FROM OLD.created_at
  THEN
    RAISE EXCEPTION
      'Invoice % is a historical record: only its status may change, and only as a result of the linked payment. Record a refund or reversal on the payment instead of editing the issued figures.',
      OLD.invoice_number
      USING ERRCODE = '42501';
  END IF;

  IF NEW.status IS DISTINCT FROM OLD.status THEN
    SELECT lower(COALESCE(p.status, '')) INTO v_payment_status
      FROM public.payments p WHERE p.id = OLD.payment_id;

    v_expected := CASE v_payment_status
      WHEN 'success'   THEN 'paid'
      WHEN 'refunded'  THEN 'refunded'
      WHEN 'cancelled' THEN 'refunded'
      WHEN 'failed'    THEN 'void'
      ELSE NULL
    END;

    IF v_expected IS NULL OR NEW.status <> v_expected THEN
      RAISE EXCEPTION
        'Invoice % status can only become "%" to match its payment (currently "%"). Invoice status cannot be edited directly.',
        OLD.invoice_number, COALESCE(v_expected,'n/a'), v_payment_status
        USING ERRCODE = '42501';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_invoices_immutable ON public.invoices;
CREATE TRIGGER trg_invoices_immutable
  BEFORE UPDATE ON public.invoices
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_invoice_snapshot();

-- ---------------------------------------------------------------------------
-- 2c-ii. Payment status lifecycle (R11).
--
-- The payment is the source of truth the invoice mirrors, so it must itself only
-- move along legitimate lifecycle edges. Without this, a client could set
-- payments.status from 'refunded' straight back to 'success' and the invoice
-- would faithfully follow, re-presenting a returned payment as collected.
--
--   pending -> success | failed | cancelled
--   success -> refunded | cancelled | failed
--   failed / refunded / cancelled -> terminal
--
-- A no-op write (same status) is always allowed so the existing triggers and the
-- fee sync run untouched.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.enforce_payment_status_transition()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_old text := lower(COALESCE(OLD.status, ''));
  v_new text := lower(COALESCE(NEW.status, ''));
BEGIN
  IF v_new = v_old THEN
    RETURN NEW;
  END IF;

  IF NOT (
       (v_old = 'pending' AND v_new IN ('success', 'failed', 'cancelled'))
    OR (v_old = 'success' AND v_new IN ('refunded', 'cancelled', 'failed'))
  ) THEN
    RAISE EXCEPTION
      'Invalid payment status transition "%" -> "%" for payment %. Allowed: pending -> success/failed/cancelled, success -> refunded/cancelled/failed. failed, refunded and cancelled are final.',
      v_old, v_new, OLD.id
      USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.protect_invoice_snapshot() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.enforce_payment_status_transition() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_payments_status_lifecycle ON public.payments;
CREATE TRIGGER trg_payments_status_lifecycle
  BEFORE UPDATE OF status ON public.payments
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_payment_status_transition();

-- ---------------------------------------------------------------------------
-- 2d. Invoice number allocation.
--
-- The row lock taken by INSERT ... ON CONFLICT DO UPDATE serialises concurrent
-- callers for the same (institute, year), so two simultaneous payments can
-- never be handed the same number. Numbering is monotonic and per institute.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.next_invoice_number(p_institute_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_year int;
  v_next bigint;
BEGIN
  v_year := EXTRACT(YEAR FROM now())::int;

  INSERT INTO public.invoice_counters AS c (institute_id, fiscal_year, last_value)
  VALUES (p_institute_id, v_year, 1)
  ON CONFLICT (institute_id, fiscal_year)
  DO UPDATE SET last_value = c.last_value + 1
  RETURNING last_value INTO v_next;

  RETURN 'INV-' || v_year::text || '-' || lpad(v_next::text, 6, '0');
END;
$$;

-- R3: SECURITY DEFINER functions are EXECUTE-to-PUBLIC by default. Without this
-- any signed-in (or anon) role could call next_invoice_number() directly and
-- consume invoice numbers, or probe institute UUIDs. The trigger below still
-- works because it executes as the function owner.
REVOKE ALL ON FUNCTION public.next_invoice_number(uuid) FROM PUBLIC, anon, authenticated;

-- ---------------------------------------------------------------------------
-- ---------------------------------------------------------------------------
-- 2e. Invoice creation.
--
-- ensure_invoice_for_payment() holds the real work and is callable from both
-- triggers. generate_invoice_for_payment() is a thin AFTER INSERT wrapper.
--
-- The separate entry point exists because a payment can become successful
-- LATER: a payment recorded as 'pending' and later confirmed 'success' is a
-- successful payment and must be invoiced exactly once. Before this split a
-- pending->success transition produced NO invoice at all (verified: P4 = 0),
-- because generation only ran on INSERT.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.ensure_invoice_for_payment(p_payment_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  p             public.payments%ROWTYPE;
  v_invoice_no  text;
  v_inst        public.institutes%ROWTYPE;
  v_student     public.students%ROWTYPE;
  v_fee         public.fees%ROWTYPE;
  v_batch_name  text;
  v_course_name text;
  v_paid_before numeric(12,2) := 0;
  v_fee_total   numeric(12,2);
  v_prev_due    numeric(12,2);
  v_remaining   numeric(12,2);
BEGIN
  IF p_payment_id IS NULL THEN
    RETURN;
  END IF;

  SELECT * INTO p FROM public.payments WHERE id = p_payment_id;
  IF NOT FOUND THEN
    RETURN;
  END IF;

  -- Only a genuinely successful payment produces a paid invoice.
  -- pending / failed / refunded / cancelled produce nothing.
  IF lower(COALESCE(p.status, '')) <> 'success' THEN
    RETURN;
  END IF;

  -- Idempotency: one invoice per payment, enforced by UNIQUE(payment_id) as
  -- well as this guard, so retries and repeated finalizations cannot duplicate.
  IF EXISTS (SELECT 1 FROM public.invoices WHERE payment_id = p.id) THEN
    RETURN;
  END IF;

  SELECT * INTO v_inst    FROM public.institutes WHERE id = p.institute_id;
  SELECT * INTO v_student FROM public.students    WHERE id = p.student_id;
  SELECT * INTO v_fee     FROM public.fees        WHERE id = p.fee_id;

  SELECT b.name INTO v_batch_name  FROM public.batches b WHERE b.id = v_student.batch_id;
  SELECT c.name INTO v_course_name FROM public.courses c WHERE c.id = v_student.course_id;

  -- previous_due / remaining_due come from the payments ledger, NOT from
  -- fees.due_amount. fees.due_amount is only correct here if
  -- trg_payments_fee_sync happened to run first, and that ordering is
  -- alphabetical rather than a guaranteed contract. Summing successful payments
  -- for this fee (excluding the one being invoiced) is correct regardless of
  -- trigger firing order, and uses the same definition apply_fee_paid_delta()
  -- applies: due = total - discount - paid.
  SELECT COALESCE(SUM(q.amount), 0) INTO v_paid_before
    FROM public.payments q
   WHERE q.fee_id = p.fee_id
     AND q.id <> p.id
     AND lower(COALESCE(q.status, '')) = 'success';

  -- With no linked fee the due figures are unknown, not zero; NULL avoids
  -- printing a fabricated "Previous Due 0.00" on a real invoice.
  IF v_fee.id IS NULL THEN
    v_fee_total := NULL;
    v_prev_due  := NULL;
    v_remaining := NULL;
  ELSE
    v_fee_total := GREATEST(0, COALESCE(v_fee.total_amount, 0) - COALESCE(v_fee.discount_amount, 0));
    v_prev_due  := GREATEST(0, v_fee_total - v_paid_before);
    v_remaining := GREATEST(0, v_fee_total - v_paid_before - COALESCE(p.amount, 0));
  END IF;

  v_invoice_no := public.next_invoice_number(p.institute_id);

  INSERT INTO public.invoices (
    institute_id, payment_id, invoice_number, status,
    payment_date, payment_method, reference_number, receipt_number,
    amount_paid, fee_total, previous_due, remaining_due,
    student_id, student_name, student_code, batch_name, course_name,
    institute_name, institute_address, institute_phone, institute_email,
    institute_gstin, institute_logo
  ) VALUES (
    p.institute_id, p.id, v_invoice_no, 'paid',
    p.payment_date, p.payment_method, p.reference_number, p.receipt_number,
    p.amount, v_fee_total, v_prev_due, v_remaining,
    v_student.id, v_student.full_name, v_student.student_id_code, v_batch_name, v_course_name,
    v_inst.name, v_inst.address, v_inst.phone, v_inst.email,
    v_inst.gstin, COALESCE(v_inst.logo_url, v_inst.logo)
  )
  ON CONFLICT (payment_id) DO NOTHING;
END;
$$;

REVOKE ALL ON FUNCTION public.ensure_invoice_for_payment(uuid) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.generate_invoice_for_payment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.ensure_invoice_for_payment(NEW.id);
  RETURN NULL;
END;
$$;

REVOKE ALL ON FUNCTION public.generate_invoice_for_payment() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_payments_invoice ON public.payments;
CREATE TRIGGER trg_payments_invoice
  AFTER INSERT ON public.payments
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_invoice_for_payment();
-- 2f. Refunds, reversals and late failures.
--
-- The original invoice is PRESERVED; only its status is marked. Amounts are
-- never rewritten, so the issued document stays a faithful historical record.
--   success            -> paid
--   refunded/cancelled -> refunded   (money returned; invoice retained)
--   failed             -> void       (R6: was previously left as 'paid')
-- A payment that is inserted directly as failed/pending never gets an invoice,
-- The original invoice is PRESERVED; only its status is marked. Amounts are
-- never rewritten, so the issued document stays a faithful historical record.
--   success            -> paid,   and an invoice is created if none exists yet
--                         (covers a payment confirmed after being recorded pending)
--   refunded/cancelled -> refunded (money returned; invoice retained)
--   failed             -> void     (a late failure must not stay marked paid)
CREATE OR REPLACE FUNCTION public.sync_invoice_status_for_payment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF lower(COALESCE(NEW.status, '')) IN ('refunded', 'cancelled') THEN
      UPDATE public.invoices SET status = 'refunded' WHERE payment_id = NEW.id;
    ELSIF lower(COALESCE(NEW.status, '')) = 'failed' THEN
      UPDATE public.invoices SET status = 'void'      WHERE payment_id = NEW.id;
    ELSIF lower(COALESCE(NEW.status, '')) = 'success' THEN
      -- Late confirmation: a payment recorded as pending and now successful is
      -- a successful payment, so it is invoiced here (exactly once).
      PERFORM public.ensure_invoice_for_payment(NEW.id);
    END IF;
  END IF;
  RETURN NULL;
END;
$$;
DROP TRIGGER IF EXISTS trg_payments_invoice_status ON public.payments;
CREATE TRIGGER trg_payments_invoice_status
  AFTER UPDATE OF status ON public.payments
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_invoice_status_for_payment();

-- ---------------------------------------------------------------------------
-- 2g. Backfill invoices for payments recorded before this migration.
-- Idempotent (ON CONFLICT (payment_id) DO NOTHING), so it is safe to re-run.
-- ---------------------------------------------------------------------------
INSERT INTO public.invoices (
  institute_id, payment_id, invoice_number, status,
  payment_date, payment_method, reference_number, receipt_number,
  amount_paid, fee_total, previous_due, remaining_due,
  student_id, student_name, student_code, batch_name, course_name,
  institute_name, institute_address, institute_phone, institute_email,
  institute_gstin, institute_logo
)
SELECT
  p.institute_id, p.id, public.next_invoice_number(p.institute_id), 'paid',
  p.payment_date, p.payment_method, p.reference_number, p.receipt_number,
  p.amount,
  CASE WHEN f.id IS NULL THEN NULL
       ELSE GREATEST(0, COALESCE(f.total_amount, 0) - COALESCE(f.discount_amount, 0)) END,
  CASE WHEN f.id IS NULL THEN NULL
       ELSE GREATEST(0, GREATEST(0, COALESCE(f.total_amount,0) - COALESCE(f.discount_amount,0))
             - COALESCE((SELECT SUM(q.amount) FROM public.payments q
                          WHERE q.fee_id = f.id AND q.id <> p.id
                            AND lower(COALESCE(q.status,'')) = 'success'), 0)) END,
  CASE WHEN f.id IS NULL THEN NULL
       ELSE GREATEST(0, GREATEST(0, COALESCE(f.total_amount,0) - COALESCE(f.discount_amount,0))
             - COALESCE((SELECT SUM(q.amount) FROM public.payments q
                          WHERE q.fee_id = f.id AND q.id <> p.id
                            AND lower(COALESCE(q.status,'')) = 'success'), 0)
             - COALESCE(p.amount, 0)) END,
  s.id, s.full_name, s.student_id_code, b.name, c.name,
  i.name, i.address, i.phone, i.email, i.gstin, COALESCE(i.logo_url, i.logo)
FROM public.payments p
LEFT JOIN public.fees f     ON f.id = p.fee_id
LEFT JOIN public.students s ON s.id = p.student_id
LEFT JOIN public.batches b  ON b.id = s.batch_id
LEFT JOIN public.courses c  ON c.id = s.course_id
JOIN public.institutes i    ON i.id = p.institute_id
WHERE lower(COALESCE(p.status, '')) = 'success'
ON CONFLICT (payment_id) DO NOTHING;
