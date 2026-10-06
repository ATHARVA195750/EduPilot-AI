# EduPilot — Auth & Security Audit (A–Z Report)

**Project:** `edupilot-ai` · Supabase ref `iunocsnmqptjxfsemhwf` (live)
**Repository:** `c:\Users\Atharva\Desktop\edu` (branch `master`)
**Audit date:** 2026-09-27 · **Mode:** autonomous live (read/write against a disposable QA tenant)
**Result:** **121 / 121 live checks PASS** · 2 critical root causes closed & verified · 1 code defect fixed · 13 findings recorded (4 remain open, all low/medium)

---

## 1. Executive summary

The audit started from three suspected root causes (lowercase `status` blocking provisioning,
an open table-level `UPDATE` grant on `profiles`, and a missing `is_active_user()` gate) and
ended with a verified hardening of the whole authentication/authorisation boundary.

**What was broken (confirmed on the live database):**

| # | Defect | Severity | Status |
|---|--------|----------|--------|
| F-01 | Any signed-in user could `PATCH /profiles?id=eq.<self>` with `{"role":"owner"}` and become an **owner of their institute** (table-level `UPDATE` + column grants on `role`/`status`/`institute_id` + a `WITH CHECK` of only `id = auth.uid()`). | **Critical** | **Fixed & live-verified** |
| F-02 | `profiles.status` was stored lowercase (`active`) while the provisioning Edge Function compares to `'Active'` → **every** account-provisioning call returned 403; the feature was dead in production. | **Critical** | **Fixed & live-verified** |
| F-04 | 9 of 13 `SECURITY DEFINER` helpers ignored account status, so a deactivated user kept full self-service access with their live JWT. | Medium | **Fixed & live-verified** |
| F-05 | `teachers.teacher_id_code` did not exist although the provisioning function writes it → teacher provisioning could never succeed. | Medium | **Fixed & live-verified** |
| F-06 | No governance path to deactivate an account (only the exploitable raw `PATCH`), no tenant scoping, no self-lockout protection. | Medium | **Fixed & live-verified** |
| F-07 | The `admin-provision-user` Edge Function **was not deployed** (404 for every provisioning call). | Medium | **Fixed (deployed v1, ACTIVE)** |

**What was hardened (migration `supabase/migrations/20260927_auth_status_hardening.sql`, applied):**
`status` normalised to `Active` + column default · new `public.is_active_user()` · all 11
`SECURITY DEFINER` helpers gated on it · 9 self-service policies re-stated with the gate ·
table-level `UPDATE` revoked from `authenticated` and column grants narrowed to
`full_name, phone` · new `profiles_owner_admin_update` policy · new audited
`admin_set_profile_status(uuid,text)` RPC · `teachers.teacher_id_code` + unique index.

**What the audit also produced:**
* a live E2E matrix (login / role-escalation / tenant isolation / RPC / session / lifecycle /
  provisioning / regression / cleanup) that is **re-runnable** (`%TEMP%\edupilot_e2e\e2e_matrix.py`),
* one **open code defect fixed**: the login status gate in `src/services/authService.js` could
  **fail open** for a deactivated account (F-03),
* an honest register of **13 findings** including 4 that are still open (F-03 fixed in source but
  needs a deploy; F-08, F-11, F-13 accepted/hardening).

---

## 2. Scope & method

**In scope:** Supabase Auth configuration behaviour, `public` schema RLS (72 policies), table &
column grants, `SECURITY DEFINER` helpers, the `admin-provision-user` Edge Function, the frontend
login/session/status paths (`src/services/authService.js`, `src/contexts/AuthContext.jsx`,
`src/contexts/InstituteContext.jsx`, `src/utils/idGenerator.js`), the admin UI call sites of the
RPC, secret hygiene of `src`/`dist`/`.env`, and a full regression read of every dashboard table.

**Out of scope:** GoTrue internals/SMTP configuration, storage bucket policies, `ai-insights`
function logic, mobile clients, penetration testing of infrastructure, UI rendering quality.

**How it was verified (no guessing, no mocks):**
1. Structural snapshots of the live database before and after the migration
   (`snapshot_pre_migration.json`, `snapshot_post_migration.json`, `migration_diff.txt`).
2. A **real** QA tenant created through the public APIs: 5 auth users via the Admin API,
   2 institutes, plus a student and a teacher **provisioned through the deployed Edge Function**
   (so the ID-code → internal-email → password login path was exercised end to end).
3. Every matrix step executed against the live project with genuine JWTs obtained from GoTrue
   (anon key as `apikey`, user token as `Bearer`), never with elevated keys — except for setup and
   independent verification, where `service_role` was used and results cross-checked against raw SQL.
4. Frontend claims validated by static inspection **and** by decoding every JWT literal found in
   `dist`/`src`.
5. Cleanup verified by comparing absolute row counts to the baseline captured before the run.

**Harness hygiene:** keys and passwords were never printed or written to the evidence file; the
report contains only lengths, status codes, roles and counts. QA rows/identities were deleted at
the end of the run and the project was confirmed back at baseline.


---

## 3. Change inventory (what was actually changed)

### 3.1 Database (applied live, migration file committed)
`supabase/migrations/20260927_auth_status_hardening.sql` — 9 sections:

| § | Change | Live proof |
|---|--------|-----------|
| 1 | `profiles.status` lowercased values normalised to `Active`/`Inactive`; `DEFAULT 'Active'` | all 4 pre-existing profiles now `Active`; new QA rows get `Active` automatically |
| 2 | new `public.is_active_user()` (`STABLE SECURITY DEFINER`, `search_path=public`) | returns `true` for active, `false` for deactivated (B-04/B-05) |
| 3 | 11 helpers gated on `is_active_user()` / `status = 'Active'` (`get_my_role`, `get_my_institute_id`, `is_owner_or_admin`, `is_student`, `is_teacher`, `student_in_batch`, `student_in_course`, `student_owns_record`, `teacher_assigned_to_batch`, `teacher_assigned_to_subject`, `teacher_owns_record`) | diff shows every body changed; deactivated teacher loses data-plane reads (E-03…E-06) |
| 4 | 9 self-service policies re-stated with the gate (`institutes` ×3, `notifications` ×2, `profiles` ×3, `teacher_assignments` ×1) | `migration_diff.txt` §3 |
| 5 | `teachers.teacher_id_code` + unique index `teachers_teacher_id_code_key` | F-10: value persisted and linked to the auth user |
| 6 | new policy `profiles_owner_admin_update` (owner/admin may edit same-institute profiles) | C-08 allowed, C-09/C-10 denied |
| 7 | new RPC `admin_set_profile_status(uuid,text)` — SECURITY DEFINER, caller validation, `initcap(lower())` normalisation, self-change refused, institute-scoped | D-01…D-11 |
| 8 | `REVOKE UPDATE ON public.profiles FROM authenticated`; column `UPDATE` narrowed to `full_name, phone` | C-01…C-04 blocked/limited; escalation re-read clean (C-05) |
| 9 | assertion block (`RAISE EXCEPTION` if statuses are not normalised) | executed during the apply |

**Structural delta (pre → post):** policies **71 → 72**, helper/RPC functions **11 → 13**,
`authenticated` lost **table-level UPDATE** plus **8 column UPDATE grants**
(`avatar_url, branch_id, created_at, email, id, institute_id, role, status`),
`admin_set_profile_status` EXECUTE granted to `authenticated`+`service_role` (not `anon`).

### 3.2 Edge Function
`admin-provision-user` was **not deployed** (only `ai-insights` existed) → deployed during this
audit (`npx supabase@latest functions deploy admin-provision-user --project-ref iunocsnmqptjxfsemhwf`)
→ **ACTIVE, version 1**. Verified live: student + teacher provisioning, ID-code login, cross-tenant
404, linked-record guard, rollback on failure.

### 3.3 Frontend (code changed in this audit)
* `src/services/authService.js` — **fail-closed status gate** (F-03): a missing profile row or a
  profile read error now signs the session out and throws, instead of being treated as “active”.
  This matters because the hardened policy *hides* the row of a deactivated account.
* `src/contexts/InstituteContext.jsx` — the “profile missing” message now names both causes
  (inactive account / unconfigured profile), because RLS makes them indistinguishable.
* Validation: `npm run build` → **✓ built in 14.12s**; the rebuilt bundle was re-scanned and still
  contains no `service_role` material (`dist` JWT inventory: `{anon: 1}` only).
* Login page wiring confirmed: `src/pages/Auth/Login.jsx` calls
  `authService.loginWithIdentifier(...)`, i.e. the fixed gate is on the real UI login path
  (the second gate in `InstituteContext` was already fail-closed).

---

## 4. Live test matrix — results

Machine-readable evidence: `%TEMP%\edupilot_e2e\evidence_e2e.json` (121 checks, run tag `qa235653`)
and `e2e_run4.log`. Re-runnable with `powershell -File %TEMP%\edupilot_e2e\run_e2e.ps1`.

| Group | Checks | Result | What it proves |
|-------|-------:|--------|----------------|
| **SETUP** | 5 | PASS | baseline captured; 2 QA institutes, 5 auth users, 5 profiles created |
| **A — login** | 9 | PASS | owner/admin/other-owner/inactive login via the GoTrue password grant (JWT `role=authenticated`, `sub=uid`, future `exp`); wrong password + unknown identity → 400; anon key alone cannot read `profiles`; Edge Function → 401 without a bearer |
| **B — status read gate** | 5 | PASS | active user reads own profile; **inactive user reads 0 rows** (RLS gate); `is_active_user()` / `get_my_role()` / `get_my_institute_id()` correct per status |
| **F — provisioning EF** | 18 | PASS | 401 anon; 403 inactive student; **403 inactive owner (the F-02 root cause)**; 400 bad `targetType`; student provisioned (`STU-26-xxxx` + 10-char temp password) with profile+row linked; **ID-code → internal-email login works**; teacher provisioned (`TCH-26-xxxx`) with `teacher_id_code` persisted; role gates for teacher/student; cross-tenant `existingRecordId` → 404; already-linked → 400; linked-record path sets `user_id`; **failed insert → 500 with zero orphan auth user/profile** |
| **C — escalation** | 34 | PASS | owner/admin/student/teacher self-`role`, self-`status`, self-`institute_id`, `id`, `email`, `avatar_url` all blocked (403 / 0 rows); `full_name` + `phone` still allowed; profile INSERT/DELETE denied; owner may edit a colleague but **not** their `role`; cross-tenant edits → 0 rows; anon PATCH → 0 rows; independent re-read confirms **no mutation landed** |
| **D — RPC governance** | 11 | PASS | student/teacher/inactive-owner/anon/foreign-owner denied; self-change refused; `HACKED` rejected; lowercase `inactive` normalised; active admin can reactivate; unknown uuid → clean error |
| **E — lifecycle on a live session** | 9 | PASS | deactivating the teacher stripped the **already-issued JWT** of profile reads, writes, RPC use and data-plane reads; a fresh login is still issued by GoTrue but every database path is denied; reactivation restores access to the *same* token; sign-out → 204 |
| **S — session** | 7 | PASS | refresh grant issues a working new token; logout revokes (204); revoked/forged refresh token → 400; pre-issued access token stays cryptographically valid until `exp` (documented residual risk) |
| **G — secret hygiene** | 6 | PASS | `dist` contains **no** `service_role` key or identifier (JWT decoding, not substring guessing); `src` clean, no credential logging; all env vars `VITE_*`; anon EXECUTE inventory = self-scoped helpers only; anon write grants contained by RLS |
| **H — regression** | 5 | PASS | owner reads all 14 dashboard tables; student/teacher self-service reads intact; tenant isolation intact; **non-QA production row counts identical to baseline** |
| **I — cleanup** | 4 | PASS | QA rows/users deleted; counts returned exactly to baseline (`profiles 4 / students 6 / teachers 1 / institutes 1 / auth users 9`) |

### Notable before/after evidence
* **Escalation closed (F-01):** `authenticated` went from table-level `UPDATE` + column `UPDATE` on
  `id/role/status/institute_id/email/avatar_url/branch_id/created_at` and
  `WITH CHECK (id = auth.uid())`, to **no table-level UPDATE** and column `UPDATE` on
  `full_name, phone` only; `WITH CHECK` is now `(id = auth.uid()) AND is_active_user()`.
  Live: `PATCH {"role":"owner"}` → **403 `permission denied for table profiles`** for every role.
* **Provisioning revived (F-02):** all 4 pre-existing profiles were `status = 'active'`;
  now `Active` with a column default. Live: inactive owner → 403, active owner → 200 + working
  ID-code login.
* **Deactivation now bites (F-04):** the same JWT that could read and write a teacher’s own profile
  before the RPC call could not read or write anything after it (E-01 → E-03/E-04/E-06).


---

## 5. Findings register

| ID | Severity | Title | Status |
|----|----------|-------|--------|
| F-01 | **Critical** | Any signed-in user could set their own `profiles.role = owner` (privilege escalation) | Fixed & verified |
| F-02 | **Critical** | Provisioning dead: `profiles.status` stored lowercase `active` while the gate compares to `Active` | Fixed & verified |
| F-03 | High | Login status gate could **fail open** for a deactivated account (side effect of the new RLS gate) | **Fixed in source (needs deploy)** |
| F-04 | Medium | 9 of 13 `SECURITY DEFINER` helpers ignored account status | Fixed & verified |
| F-05 | Medium | `teachers.teacher_id_code` missing → teacher provisioning always failed | Fixed & verified |
| F-06 | Medium | No governance path to deactivate an account (raw, exploitable writes only) | Fixed & verified |
| F-07 | Medium | `admin-provision-user` Edge Function not deployed (404 in production) | Fixed (deployed v1) |
| F-08 | Low | Stateless access tokens cannot be revoked before `exp` | Accepted & documented |
| F-09 | Low | Read-only RLS helpers remain EXECUTE-able by `anon` (self-scoped, no leak) | Accepted (optional hygiene) |
| F-10 | Low | Mixed status casing (`profiles` `Active` vs domain tables `active`) | Accepted (trap for future code) |
| F-11 | Low | Provisioning EF returns raw database error text to the caller | **Open** (recommendation) |
| F-12 | Info | Live schema drift: `public.classes` does not exist though files reference it | **Open** (environment) |
| F-13 | Low | `anon` still holds INSERT/UPDATE/DELETE grants on the identity tables (RLS-contained) | **Open** (hardening follow-up) |

### Detail for the open / noteworthy items

**F-03 — fail-open login gate (fixed in this audit, deploy required).**
`authService.loginWithIdentifier()` only rejected a session when a profile row came back with a
non-`Active` status. The hardening makes `profiles_self_select` require `is_active_user()`, so for a
deactivated account the row is *hidden*: the query returns `[]` with no error → `profile === null`
→ the old guard passed → the user was admitted into an empty dashboard instead of being told the
account is deactivated. Database gating kept the session inert (no reads, no writes), so this was an
authorisation-clarity/UX defect and not an exposure. The code now treats a missing row or a read
error as inactive (signOut + throw), which matches the DB gate, and the InstituteContext message now
covers both causes. **Deploy the rebuilt bundle for this to take effect in production.**

**F-08 — token revocation.** A deactivated or signed-out user keeps a valid JWT until `exp`
(GoTrue issues short-lived access tokens). Verified: after logout the token still reaches PostgREST
(S-07) but after deactivation it reaches nothing (E-03…E-06). Keep the profile-status check inside
every future Edge Function — `admin-provision-user` already does this correctly.

**F-11 — error verbosity.** The EF’s catch block returns `error.message` verbatim
(`invalid input syntax for type numeric: "not-a-number"`), disclosing column types/query shape.
No secrets or rows leak. Return a generic message and log the detail server-side.

**F-13 — anon grants.** `anon` retains `INSERT/UPDATE/DELETE` on `profiles`, `students`, `teachers`
and `institutes` (12 combinations, default grants). No policy matches `anon`, so all such writes
affect 0 rows — verified live (C-11 + C-11b: no row changed). I deliberately did **not** revoke
these grants in this audit because the repo contains anonymous-facing data capture paths whose
privilege requirements must first be confirmed (revoking blindly could break a public lead form).
Recommended follow-up: `REVOKE INSERT, UPDATE, DELETE ON public.profiles FROM anon;` (and the other
identity tables), keeping only the tables that genuinely need anonymous inserts.


---

## 6. Residual risk & prioritised recommendations

1. **Deploy the frontend fix (F-03).** The fail-closed login gate is in `src/` and the bundle is
   rebuilt, but production still serves the old bundle until it is deployed. (Highest priority of the
   remaining items — it is the only place where a deactivated user still gets a poor outcome.)
2. **Add `admin-provision-user` to the release checklist (F-07).** The function had never been
   deployed; a deployment step (or CI job) prevents a silent 404 regression.
3. **Decide on `anon` grants (F-13).** Revoke DML on the identity tables; keep it only where an
   anonymous flow genuinely needs it, and add a test that proves the intended anon path still works.
4. **Generic Edge Function errors (F-11).** Return a generic message, log the detail.
5. **Keep the status gate inside every new Edge Function (F-08).** The DB gate protects PostgREST,
   not service-role code paths.
6. **Standardise status casing (F-10)** when the domain tables are next migrated
   (`profiles` `Active` vs `students/teachers/batches` `active`) — either casing + a constraint, or
   an enum.
7. **Reconcile the checked-in schema with live (F-12).** `public.classes` is referenced by files but
   does not exist on the database; new RLS work must target the live schema.
8. **Add a schema/RPC smoke test to CI** (e.g. a trimmed version of group C/D from this matrix) so a
   future grant widening or policy edit is caught automatically.
9. **Optional:** `REVOKE EXECUTE ... FROM anon` on the read-only helper set (F-09) — hygiene only.
10. **Note:** `npm run lint` cannot run in this repo (no ESLint config file is present); the build
    (`vite build`) was used for validation instead. Add an `.eslintrc` if linting is expected in CI.

---

## 7. Reproducing this audit

```powershell
# 1) keys (service_role fetched via the Supabase Management API, never printed)
powershell -File "$env:TEMP\edupilot_e2e\probe_keys.ps1"     # -> key_anon.txt, key_service_role.txt

# 2) database snapshots (rollback reference)
powershell -File "$env:TEMP\edupilot_e2e\snap.ps1" -Tag post_migration

# 3) full live matrix (creates a disposable QA tenant, then deletes it)
powershell -File "$env:TEMP\edupilot_e2e\run_e2e.ps1"        # -> evidence_e2e.json
```

| Artefact | Path |
|----------|------|
| Migration (applied) | `supabase/migrations/20260927_auth_status_hardening.sql` |
| Pre/post DB snapshots | `%TEMP%\edupilot_e2e\snapshots\snapshot_{pre,post}_migration.json` |
| Structural diff | `%TEMP%\edupilot_e2e\migration_diff.txt` |
| Live matrix + evidence | `%TEMP%\edupilot_e2e\e2e_matrix.py`, `evidence_e2e.json`, `e2e_run4.log` |
| Schema/fact probes | `%TEMP%\edupilot_e2e\schema_facts.txt`, `pre_facts.ps1` |
| This report | `AUDIT_REPORT_auth_hardening.md` |

**Rollback:** the migration is additive except for the `status` normalisation; to revert, restore the
policy/function definitions from `snapshot_pre_migration.json` (§3/§4 of the snapshot contain every
policy expression and helper body) and re-`GRANT UPDATE ON public.profiles TO authenticated` with the
original column grants. The QA harness never touched production rows (H-05/I-03 verified identical
counts before and after every run).

---

## 8. Conclusion

All three suspected root causes were confirmed on the live database, closed by the applied migration
and re-verified from the outside (real JWTs, real REST/RPC/Edge Function calls):

* the **privilege-escalation hole** on `profiles` is shut for every role, including owners,
  with an independent service-role re-read proving no mutation lands;
* **provisioning works end to end** (owner → Edge Function → `STU-/TCH-` code → ID-code login),
  with tenant isolation, duplicate guards and a rollback path that leaves no orphan credentials;
* **deactivation now revokes access immediately**, including for sessions that were already issued,
  because every helper and the 9 self-service policies are gated on `is_active_user()`.

The one residual product defect (a fail-open status check in the login screen, introduced by the
stronger RLS gate) was found by the audit, fixed in source and validated by a production build.
Four low/informational findings remain, all documented above with concrete remediations.

**Final live state:** 121/121 checks pass · QA artefacts removed · production row counts
(`profiles 4 / students 6 / teachers 1 / institutes 1`) and auth-user count (9) identical to the
pre-audit baseline.

