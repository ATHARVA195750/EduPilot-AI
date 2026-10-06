-- ============================================================================
-- BATCH 5 CORRECTIVE PATCH 1 (APPLIED)
--
-- Fix: announcements_test_batch_uniq was created as a PARTIAL unique index
--      (WHERE test_id IS NOT NULL). A partial index cannot be inferred as an
--      ON CONFLICT conflict target, so the application's
--      upsert(..., { onConflict: 'test_id,batch_id' }) failed with
--      HTTP 400 / SQLSTATE 42P10 ("there is no unique or exclusion constraint
--      matching the ON CONFLICT specification").
--
-- Correction: recreate it as a FULL unique index on (test_id, batch_id).
--
-- Safety:
--   * Pre-checked: zero duplicate non-null (test_id, batch_id) pairs exist, so
--     creating the index cannot fail and no user data is touched.
--   * test_id and batch_id remain NULLABLE exactly as before.
--   * Ordinary announcements (test_id IS NULL) are unaffected: PostgreSQL
--     treats NULLs as distinct in a standard unique index, so many rows with a
--     NULL test_id remain insertable (verified: 3 such rows inserted).
--   * Duplicate non-null (test_id, batch_id) pairs are still prevented.
--   * The announcements table is NOT dropped or recreated.
--   * No RLS policy is created, altered or dropped; the authorization model is
--     untouched (F-24 byte-for-byte identical).
--   * The announcements_test_requires_batch CHECK is already in place and
--     already guarantees test-linked rows are batch-scoped.
-- ============================================================================

DROP INDEX IF EXISTS public.announcements_test_batch_uniq;

CREATE UNIQUE INDEX announcements_test_batch_uniq
  ON public.announcements (test_id, batch_id);

COMMENT ON INDEX public.announcements_test_batch_uniq IS
  'One topper announcement per (test_id, batch_id). Must remain a NON-partial unique index so it can be used as an ON CONFLICT target. Ordinary announcements (test_id IS NULL) are unaffected because NULLs are distinct.';