# EduPilot Master QA Execution Report

**Campaign date:** 2026-10-02  
**Scope:** Test-case design and safe execution for all 35 requested modules, eight E2E workflows, and eleven security cases. This is runtime QA, not a pilot-readiness declaration.  
**Data safety:** No SQL was run. No application data was created, changed, or deleted. No credentials, tokens, or student personal information are included.

## Executive Summary

|Measure|Count|
|---|---:|
|Designed cases|124|
|Executed applicable cases|25|
|PASS|25|
|FAIL|0 confirmed in this campaign|
|BLOCKED|87|
|NOT RUN|9|
|N/A|3|
|Pass rate among executed applicable cases|100% (25/25)|

The denominator is only cases that could be safely executed and produced a definite result. It is not a coverage or readiness score. Most write, cross-role, and multi-tenant cases are blocked because only a real institute was available and no disposable test tenant or role fixtures were provided. See the [master test register](MASTER_QA_TEST_CASES.md), [87-case blocker mapping](MASTER_QA_BLOCKER_MATRIX.md), and [QA environment setup](MASTER_QA_ENVIRONMENT_SETUP.md).

## Execution Evidence

|Evidence ID|Result|Observed result|
|---|---|---|
|PW-AUTH-ANON|PASS|Fresh browser context opened six protected URLs (dashboard, teacher, student, students, finance, profile); each ended at `/login`.|
|PW-WRONG-ROLE|PASS|Owner opened `/student`; app redirected to `/dashboard`, with owner portal content.|
|PW-ROUTE-MAIN|PASS|Owner main content rendered on branches, courses/subjects, batches, students, teachers, attendance, timetable, homework, tests, results, fees, payments, finance/expenses, payroll, communication, reports/analytics, and settings routes. This was a render smoke check, not CRUD verification.|
|PW-BATCH-REFRESH|PASS|An existing roster assignment displayed the same batch label before and after refresh. No assignment was changed.|
|PW-ATTENDANCE-UNSAVED|PASS|Without saving, attendance controls changed the summary from 7/7 to 6/7 for absent and back to 7/7 for late. This did not verify persistence.|
|PW-TIMETABLE-REFRESH|PASS|An existing schedule’s date and start/end times matched after refresh and in its edit form. No edit was saved.|
|PW-CONFLICT-HELPER|PASS|Fresh browser module import reported three same-date resource conflicts and zero conflicts for an otherwise identical different date.|
|PW-RESPONSIVE|PASS|At 390px, 768px, and 1440px, document scroll width equaled client width on the timetable page.|
|PW-LOGOUT|BLOCKED|Local UI redirected to `/login`, and protected route remained at `/login`. The logout POST was aborted during navigation (`ERR_ABORTED`); server-side revocation was not confirmed.|
|NODE-TESTS|PASS|`node --test` ran four schedule-conflict tests; all four passed. No other discoverable Node tests were found.|
|PW-ANONYMOUS-SUITE|PASS|The final Playwright run passed ten anonymous tests: seven protected-route redirects, registration redirect, public landing shell, and empty required-field validation.|
|PW-ENQUIRY-VALIDATION|PASS (subcase)|Blank required name/phone fields are invalid and produce no enquiry RPC/REST request. The full malformed-input case remains BLOCKED.|
|QA-PRODUCTION-GUARD|PASS|The harness was given the current configured project ref internally and refused it as production; no project identifier or key was printed.|
|BUILD|PASS|`npm run build` completed; Vite emitted the existing warning for chunks larger than 500 kB.|

No screenshot/trace files were captured. Browser DOM snapshots and assertions above are the evidence for the safe runtime checks. No case is marked FAIL without a reproducible failure under the defined preconditions.

## Module Breakdown

Status notation: `P` PASS, `B` BLOCKED, `NR` NOT RUN, `NA` N/A. Each module has three cases in the register.

|Module|P|B|NR|NA|Notes|
|---|---:|---:|---:|---:|---|
|Public Landing & Enquiries|1|2|0|0|Public shell and blank required-field subcase passed; live public institute data/write and malformed backend validation remain blocked.|
|Authentication|1|2|0|0|Anonymous routes passed; credentials and server revocation unverified.|
|Owner Dashboard|0|2|1|0|Dashboard main content stayed at session verification in focused sweep.|
|Admin Dashboard|0|2|0|1|Shared owner/admin dashboard exists; separate admin dashboard is unsupported.|
|Teacher Dashboard|0|3|0|0|Teacher account and assignment fixture unavailable.|
|Student Dashboard|0|3|0|0|Student account fixture unavailable.|
|Branch Management|1|2|0|0|Read-only page render passed.|
|Course Management|1|1|1|0|Read-only list rendered; CRUD blocked.|
|Subject Management|1|1|1|0|Combined course/subject page rendered; writes blocked.|
|Batch Management|1|2|0|0|Read-only page rendered; transfers blocked.|
|Student Management|1|2|0|0|Roster and controls rendered; provisioning blocked.|
|Teacher Management|1|2|0|0|Roster rendered; provisioning blocked.|
|Teacher Assignments|0|3|0|0|No safe assignment or teacher fixture.|
|Student Enrollment|1|2|0|0|Existing batch label persisted across refresh; create/transfer blocked.|
|Attendance|1|2|0|0|Unsaved status controls passed; persistence and teacher scope blocked.|
|Timetable|2|1|0|0|Existing date/time persistence and date-aware conflict regression passed; writes blocked.|
|Homework|1|2|0|0|Read-only module render passed.|
|Tests|1|2|0|0|Read-only module render passed.|
|Results|1|2|0|0|Read-only module render passed.|
|Fees|1|2|0|0|Read-only ledger render passed; financial writes blocked.|
|Payments|1|2|0|0|Read-only register render passed; payment writes blocked.|
|Invoices|0|3|0|0|No disposable invoice/fee fixture.|
|Expenses|1|2|0|0|Finance page rendered; expense writes blocked.|
|Payroll|1|2|0|0|Read-only payroll page render passed; payout blocked.|
|Announcements|1|2|0|0|Read-only communication page rendered; publish blocked.|
|Notifications|0|3|0|0|Owner correctly redirected; student session unavailable.|
|Reports & Analytics|1|1|1|0|Pages rendered; independent reconciliation/export not exercised.|
|AI Copilot|0|3|0|0|No isolated AI sandbox or teacher/student accounts.|
|Settings|1|2|0|0|Settings page rendered; live changes prohibited.|
|Profile|0|3|0|0|Student-only profile could not be tested with owner session.|
|Automation|0|1|0|2|No scheduled-job/retry feature identified; event delivery requires fixtures.|
|Responsive UI|1|0|2|0|Timetable overflow check passed at three widths; remaining form/narrow-edge checks not run.|
|Performance|0|1|2|0|No SLA or max-volume fixture.|
|Error Handling|0|2|1|0|Logout POST was aborted; mutation failure tests not run.|
|Multi-Tenant Isolation|0|3|0|0|Only one institute was available; no second tenant was created.|

**E2E:** 8 designed, 0 executed, 8 blocked. **Security:** 11 designed, 2 passed, 9 blocked. Playwright currently has nine passing anonymous checks and four role-smoke tests that remain skipped/blocked without a validated QA target and role accounts.

## Confirmed Failures

None confirmed during this campaign. In particular, no live mutation was attempted to force a failure on business data. Prior audit findings are not counted as current failures unless rerun here.

## Blocked Cases and Setup Required

- **Student/teacher workflows and wrong-role/backend scope:** disposable active student and teacher accounts linked to test records; at least one assigned and one unassigned batch; known synthetic attendance/results/fees/notifications.
- **CRUD and persistence across business modules:** isolated institute A with synthetic branches, courses, subjects, batches, students, teachers, assignments, and finance records; documented cleanup/rollback path; no shared live tenant.
- **Cross-tenant security:** two disposable institutes with separate users and identifiable synthetic rows. No SQL or RLS change is part of this campaign.
- **AI boundary/injection:** non-production AI sandbox with test roles and synthetic data, plus permission to issue prompts to that service.
- **Invoice, payment, payroll, and automation:** disposable financial fixtures and sandbox providers; no real charges or delivery channels.
- **Performance:** agreed response-time SLA, documented maximum data volumes, and an isolated load fixture.
- **Server logout revocation:** controllable staging auth session and network capture that lets the logout request complete or report its response without navigation aborting it.

## Test Infrastructure and Limits

- Playwright configuration, role/anonymous fixtures, tenant-guarded data helpers, and anonymous/role smoke specs are present. The full current run was 10 passed and 4 skipped; the skipped role tests require the separate QA project and role fixtures and were not run against production.
- The production-target guard was exercised against the current configured project and refused it. The app web server receives empty Supabase settings unless an explicit validated QA URL is supplied; QA/service-role environment variables are filtered out before launching Vite.
- The Playwright runner and Chromium/headless-shell browser are installed. The initial browser-launch failure was resolved by installing the missing headless-shell component; it was a setup failure, not an app failure.
- `node --test` discovered and passed the four existing schedule-conflict unit tests.
- `npm install` reported 12 audit findings in the dependency tree (1 low, 5 moderate, 6 high). No automatic dependency upgrades or audit fixes were applied.
- Supabase CLI and Docker are not installed, and the current CLI link plus `.env` target the real institute project. There is no local Supabase stack or separate QA project available in this workspace.
- ESLint could not be used as a campaign gate in earlier focused work because this repository has no ESLint configuration.
- Route/page render checks are not CRUD, persistence, authorization, or tenant-isolation proofs.
- The shared live institute was only read. The owner session did not provide teacher/student credentials or a disposable test tenant.
- The product’s supported feature boundary was not expanded. Separate admin dashboard and scheduled-job/retry cases are marked N/A where those features are not implemented.

## Artifacts and Worktree Safety

Created or updated for this campaign:
- [docs/MASTER_QA_TEST_CASES.md](MASTER_QA_TEST_CASES.md)
- [docs/MASTER_QA_EXECUTION_REPORT.md](MASTER_QA_EXECUTION_REPORT.md)
- [docs/MASTER_QA_BLOCKER_MATRIX.md](MASTER_QA_BLOCKER_MATRIX.md)
- [docs/MASTER_QA_ENVIRONMENT_SETUP.md](MASTER_QA_ENVIRONMENT_SETUP.md)
- `package.json`, `package-lock.json`, `playwright.config.js`, `tests/fixtures/rolePages.js`, `tests/utils/qaEnvironment.js`, `tests/utils/qaDatabase.js`, and two `tests/qa` specs.
- `playwright-report/` and `test-results/` generated by Playwright; the passing run has no application failure screenshot or trace.

The malformed CSV draft was deleted. The Playwright dev dependency and scripts were added. No application modules, SQL, migrations, RLS policies, or database records were changed. Existing unrelated/uncommitted work was preserved.

This is not a complete execution of every designed case and does not establish pilot readiness.
