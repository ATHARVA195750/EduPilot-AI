# EduPilot QA Environment Setup

## Safety Gate

**Do not run write, role, or tenant-isolation cases until a dedicated QA Supabase project exists.** The current `.env` URL and Supabase CLI link metadata match the real institute project documented in `supabase/config.toml`. The harness rejects that project ref and starts its local Vite server with empty Supabase URL/key values when no explicit QA URL is provided.

No credentials are requested in chat. Enter all secret values locally in your shell or secret manager. Never place a service-role key in a `VITE_*` variable, browser storage, screenshots, traces, committed files, or reports.

## Required Setup

1. Create a separate Supabase project dedicated to EduPilot QA. Do not use the real institute project or its auth users/data.
2. Initialize it from the authoritative schema/policies/functions for the app version under test. The checked-in `supabase/schema.sql` is an older baseline and is not sufficient evidence that the full live schema is represented. Review the migration set with the database owner before applying anything. Files named `*_PROPOSED.sql` are not approved migrations. No SQL or RLS changes were executed by this campaign.
3. Deploy only the Edge Functions required by the enabled tests to this QA project. Configure their secrets in the QA project’s secret store, not in this repository.
4. Create a synthetic QA institute and two synthetic tenants if cross-tenant cases are to run. Record their UUIDs locally as `QA_INSTITUTE_ID` and `QA_SECOND_INSTITUTE_ID`.
5. Provision four synthetic test identities: owner, admin, teacher, student. For each user, create the matching active `profiles` row. Link teacher/student auth IDs to their teacher/student records. Add at least one teacher assignment, one assigned batch and one unassigned batch. Use synthetic names, phone numbers, IDs, attendance, fee, test and notification data only.
6. Student/teacher IDs must follow the app’s internal identifier mapping. Ensure their Auth email uses the deterministic `idCodeToInternalEmail` mapping from `src/utils/idGenerator.js`; do not substitute personal accounts.
7. Set `QA_NEW_ADMIN_PASSWORD` to a synthetic password used only for the Create Admin E2E. The test generates a unique synthetic email per run and removes the created QA profile/Auth user during teardown.
8. Ensure the QA owner profile has `role = 'owner'`, active status, and the synthetic QA `institute_id`. Ensure the Admin account fixture has `role = 'admin'` in the same institute. The Admin-management test first provisions a synthetic Admin through the Edge Function, verifies the returned Auth UUID/profile/institute, tries duplicate email, signs in with email/password, verifies owner-only route denial, and relies on teardown to remove the tracked profile and Auth user.
9. Confirm cleanup in the QA project before enabling CRUD tests. The helper only tracks rows inserted through it and deletes exact tracked IDs scoped to `QA_INSTITUTE_ID`/`QA_SECOND_INSTITUTE_ID`; do not manually add untracked fixture IDs and assume they will be cleaned.
10. Keep the current production Supabase link unchanged. The test harness uses explicit `QA_SUPABASE_URL` and `QA_PROJECT_REF` values and refuses the production project ref found in `supabase/config.toml`.

## Local Environment Variables

Set these in the local PowerShell session or secret manager. Do not commit a QA env file. The placeholders below are names, not usable values.

```powershell
$env:QA_SUPABASE_URL = 'https://<qa-project-ref>.supabase.co'
$env:QA_PROJECT_REF = '<qa-project-ref>'
$env:QA_SUPABASE_ANON_KEY = '<qa-anon-key>'
$env:QA_SUPABASE_SERVICE_ROLE_KEY = '<qa-service-role-key>'
$env:QA_INSTITUTE_ID = '<synthetic-qa-institute-uuid>'
$env:QA_SECOND_INSTITUTE_ID = '<second-synthetic-institute-uuid>'
$env:QA_OWNER_EMAIL = '<qa-owner-email>'
$env:QA_OWNER_PASSWORD = '<qa-owner-password>'
$env:QA_ADMIN_EMAIL = '<qa-admin-email>'
$env:QA_ADMIN_PASSWORD = '<qa-admin-password>'
$env:QA_TEACHER_ID = '<qa-teacher-id-code>'
$env:QA_TEACHER_PASSWORD = '<qa-teacher-password>'
$env:QA_STUDENT_ID = '<qa-student-id-code>'
$env:QA_STUDENT_PASSWORD = '<qa-student-password>'
$env:QA_NEW_ADMIN_PASSWORD = '<synthetic-password-for-create-admin-test>'
```

For Bash, use `export NAME='value'` for the same variables. Supply the service-role key only to Node-side fixture setup/cleanup. The local Vite app receives only the QA URL and QA anon key; the Playwright config never forwards the service-role key to Vite.

Optional: `QA_BASE_URL` may point to a separately deployed QA frontend. If omitted, Playwright starts Vite locally on `http://127.0.0.1:4173` with QA-only Supabase values.

## Install and Run

```powershell
npm install
npx playwright install chromium
npm run test:e2e
```

To run only anonymous route checks before role accounts exist:

```powershell
npm run test:e2e -- tests/qa/anonymous-access.spec.js
```

The role smoke tests are skipped unless a validated QA project and the corresponding role credentials are present. The current executable Playwright suite covers anonymous routes and role-route smoke checks; it does **not yet automate all 124 case-register entries**. Remaining module CRUD/integration/security cases must be implemented in batches and must use these QA fixtures.

## Evidence and Database Verification

- Failed tests produce Playwright screenshots and the HTML report in `playwright-report/`. Authenticated tracing is disabled because traces may capture bearer headers or sensitive account content.
- `tests/utils/qaDatabase.js` uses the QA service-role key only in Node. It verifies the explicit non-production project ref, restricts fixture writes to tenant-scoped tables, verifies related subject rows through their QA course, tracks exact inserted IDs and cleans tracked rows child-first.
- Service-role reads are **not proof of RLS** because the service role bypasses RLS. For access-control tests, issue requests through the corresponding authenticated browser context/JWT and separately use the QA service helper only to verify fixture state remained unchanged.
- `createQaAuthUser` creates an Auth user/profile in QA. Teacher/student role tests still require linked teacher/student rows and identifier mappings; use the existing provisioning flow in QA where applicable. The Admin UI flow itself uses the Edge Function and does not use this helper to create the Admin under test.
- Cleanup runs only for rows explicitly tracked by the helper and their listed Auth IDs; do not broaden it to institute-wide deletes. Feature tests must track a created Auth UUID before teardown.

## Current Gates Still Requiring Operator Action

- Provide a dedicated non-production QA project and confirm its schema/migration state.
- Configure QA-only Edge Function secrets and deploy the supported functions.
- Create synthetic role accounts plus linked teacher/student records and assignment fixtures.
- Provide at least one additional synthetic institute for multi-tenant tests.
- Confirm the proposed test data cleanup policy and the approved QA migration set. No SQL/RLS patch is proposed or applied here.
- Review the npm audit output from adding `@playwright/test`; the install reported 12 existing dependency-tree vulnerabilities (1 low, 5 moderate, 6 high). No automated `npm audit fix` was run.
