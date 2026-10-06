# EduPilot Master Test Case Register

Run date: 2026-10-02. Statuses reflect the current campaign only. Evidence codes and outcomes are explained in [MASTER_QA_EXECUTION_REPORT.md](MASTER_QA_EXECUTION_REPORT.md). All test data below is synthetic. No live business writes were performed.

Fields: Test Case ID; Module; Feature; Test Scenario; Preconditions; Test Data; Execution Steps; Expected Result; Actual Result; Status; Severity; Evidence.

## 1. Public Landing & Enquiries
|Test Case ID|Module|Feature|Test Scenario|Preconditions|Test Data|Execution Steps|Expected Result|Actual Result|Status|Severity|Evidence|
|---|---|---|---|---|---|---|---|---|---|---|---|
|MOD01-UI|Public Landing & Enquiries|Landing route|Render the public landing page anonymously|Fresh browser context with Supabase explicitly unset|Route `/`; desktop viewport|1 Open `/`; 2 wait for the hero heading; 3 confirm protected dashboard content is absent|Public landing content is visible without auth and protected dashboard is absent|Hero heading rendered in isolated Playwright run with Supabase URL/key blank; live institute public-data request remains unverified|PASS|Medium|PW-ANON-LANDING|
|MOD01-CRUD|Public Landing & Enquiries|Enquiry create/read|Submit and reload a valid enquiry|Disposable institute and confirmed cleanup|Synthetic name and contact data|1 Open enquiry form; 2 submit valid values; 3 reload and search the enquiry|Exactly one enquiry persists and appears in the institute enquiry list|Write would affect live institute; no isolated tenant available|BLOCKED|High|SETUP-ISOLATED-TENANT|
|MOD01-NEG|Public Landing & Enquiries|Validation|Reject empty and malformed enquiry fields|Anonymous browser; malformed-value checks require QA RPC target|Blank name/phone; malformed phone|1 Submit with required fields blank; 2 assert browser validity; 3 assert no request; 4 submit malformed non-empty phone against QA RPC|Empty required fields are blocked; malformed phone is rejected by client or server without creating an enquiry|Blank required fields were invalid and emitted no request; malformed non-empty phone was not sent because the configured backend is the live institute|BLOCKED|Medium|PW-ENQUIRY-VALIDATION; SETUP-ISOLATED-TENANT|

## 2. Authentication
|Test Case ID|Module|Feature|Test Scenario|Preconditions|Test Data|Execution Steps|Expected Result|Actual Result|Status|Severity|Evidence|
|---|---|---|---|---|---|---|---|---|---|---|---|
|MOD02-UI|Authentication|Protected routing|Redirect anonymous users from protected routes|Fresh context with no auth storage|`/dashboard`, `/teacher`, `/student`, `/students`, `/finance`, `/profile`|1 Open each route directly; 2 record final URL|Each request redirects to `/login` before protected content renders|All six routes ended at `/login`|PASS|Critical|PW-AUTH-ANON|
|MOD02-CRUD|Authentication|Login and logout|Check valid/invalid login and logout per role|Isolated owner, teacher, and student accounts|Synthetic valid and invalid credentials|1 Sign in per role; 2 verify role home; 3 sign out; 4 retry invalid password|Valid users reach only their portal; invalid credentials create no session|Only shared owner context available; separate role credentials not tested|BLOCKED|High|SETUP-ROLE-ACCOUNTS|
|MOD02-NEG|Authentication|Logout revocation|Verify server logout and stale-session rejection|Authenticated disposable account|Current session|1 Click sign out; 2 open a protected route; 3 inspect logout response|Local state clears and server confirms revocation; old session cannot regain access|UI went to `/login` and protected route stayed there; logout POST was `ERR_ABORTED`, so server revocation is unverified|BLOCKED|Critical|PW-LOGOUT|

## 3. Owner Dashboard
|Test Case ID|Module|Feature|Test Scenario|Preconditions|Test Data|Execution Steps|Expected Result|Actual Result|Status|Severity|Evidence|
|---|---|---|---|---|---|---|---|---|---|---|---|
|MOD03-UI|Owner Dashboard|Dashboard shell|Render owner KPIs and institute activity|Owner session and reachable profile API|Existing read-only institute aggregates|1 Open `/dashboard`; 2 wait for KPI content; 3 inspect heading and cards|Command center and KPI values render for the active institute|Main content remained at session verification in the focused sweep|BLOCKED|High|PW-DASHBOARD-LOAD|
|MOD03-CRUD|Owner Dashboard|KPI navigation|Open modules from dashboard cards|Stable dashboard and existing rows|Student, teacher, batch, fee cards|1 Activate each card; 2 verify destination and context|Each card routes to its matching module and carries no stale institute context|Stable KPI cards were unavailable|BLOCKED|Medium|PW-DASHBOARD-LOAD|
|MOD03-NEG|Owner Dashboard|Zero-data boundary|Verify zero values and no stale data for empty institute|Disposable empty institute|Zero students, batches, fees, attendance|1 Load dashboard; 2 compare each metric to fixture values|All empty metrics show zero/empty state and no prior tenant data|No empty test tenant; not executed|NOT RUN|Medium|NOT-EXECUTED|

## 4. Admin Dashboard
|Test Case ID|Module|Feature|Test Scenario|Preconditions|Test Data|Execution Steps|Expected Result|Actual Result|Status|Severity|Evidence|
|---|---|---|---|---|---|---|---|---|---|---|---|
|MOD04-UI|Admin Dashboard|Shared dashboard|Verify admin reaches implemented dashboard|Admin-role fixture|Admin profile and institute|1 Sign in as admin; 2 open `/dashboard`; 3 verify institute KPIs|Admin uses shared dashboard with institute-scoped content|Separate admin login unavailable|BLOCKED|High|SETUP-ADMIN-ROLE|
|MOD04-CRUD|Admin Dashboard|Distinct dashboard inventory|Determine whether a separate admin dashboard exists|Route inventory|`AppRoutes` dashboard definitions|1 Inspect role routes; 2 compare owner/admin dashboard paths|Only implemented dashboard is tested; no unsupported separate page is assumed|Owner and admin share `/dashboard`; a distinct admin dashboard is not implemented|N/A|Low|ROUTE-INVENTORY|
|MOD04-NEG|Admin Dashboard|Role permissions|Compare admin and owner management controls|Owner and admin fixtures|Owner and admin roles|1 Open shared dashboard per role; 2 try an admin-sensitive action; 3 compare authorization|Role-specific actions follow the intended policy|No separate admin account available|BLOCKED|High|SETUP-ROLE-ACCOUNTS|

## 5. Teacher Dashboard
|Test Case ID|Module|Feature|Test Scenario|Preconditions|Test Data|Execution Steps|Expected Result|Actual Result|Status|Severity|Evidence|
|---|---|---|---|---|---|---|---|---|---|---|---|
|MOD05-UI|Teacher Dashboard|Teacher home|Render teacher schedule and assigned-batch summary|Active teacher fixture|One active assignment|1 Sign in as teacher; 2 open `/teacher`; 3 compare visible assignments|Only the signed-in teacher’s assigned information is shown|Teacher credentials unavailable|BLOCKED|High|SETUP-TEACHER-ACCOUNT|
|MOD05-CRUD|Teacher Dashboard|Batch integration|Open assigned batch and retain after reload|Teacher and assigned batch fixtures|One assigned batch|1 Open dashboard; 2 open assigned batch; 3 reload and verify|Assigned batch remains visible after reload|No teacher session or disposable assignment|BLOCKED|High|SETUP-TEACHER-FIXTURE|
|MOD05-NEG|Teacher Dashboard|Unassigned scope|Attempt to open a non-assigned batch|Teacher with assigned and unassigned batches|One foreign-to-teacher batch ID|1 Sign in as teacher; 2 request unassigned batch; 3 inspect UI and API rows|Unassigned data is denied and no write is possible|Teacher and second batch fixtures unavailable|BLOCKED|Critical|SETUP-TEACHER-AND-BATCH|

## 6. Student Dashboard
|Test Case ID|Module|Feature|Test Scenario|Preconditions|Test Data|Execution Steps|Expected Result|Actual Result|Status|Severity|Evidence|
|---|---|---|---|---|---|---|---|---|---|---|---|
|MOD06-UI|Student Dashboard|Student home|Render student-specific dashboard|Student auth linked to student row|Own records only|1 Sign in as student; 2 open `/student`; 3 inspect dashboard content|Only the authenticated student’s information renders|Student credentials unavailable|BLOCKED|High|SETUP-STUDENT-ACCOUNT|
|MOD06-CRUD|Student Dashboard|Aggregate consistency|Compare displayed counts to own rows|Student fixture with known academic records|Known own attendance, homework, fee records|1 Capture dashboard values; 2 compare to own rows; 3 refresh|Every aggregate equals the student’s underlying records|No student fixture or account|BLOCKED|High|SETUP-STUDENT-FIXTURE|
|MOD06-NEG|Student Dashboard|Other-student isolation|Request another student’s records|Two student fixtures|Student A and B record IDs|1 Sign in as A; 2 request B profile/results; 3 inspect response|B’s data is denied or absent|Two student fixtures unavailable|BLOCKED|Critical|SETUP-TWO-STUDENTS|

## 7. Branch Management
|Test Case ID|Module|Feature|Test Scenario|Preconditions|Test Data|Execution Steps|Expected Result|Actual Result|Status|Severity|Evidence|
|---|---|---|---|---|---|---|---|---|---|---|---|
|MOD07-UI|Branch Management|Branch list and empty state|Render institute branch catalog|Owner session|Existing branch rows|1 Open `/branches`; 2 inspect list and empty state|Only active institute branches are listed|Branch page rendered and showed zero branches|PASS|Medium|PW-ROUTE-MAIN|
|MOD07-CRUD|Branch Management|CRUD/search persistence|Create, search, edit, and delete a branch fixture|Disposable tenant with cleanup|Synthetic branch name/contact|1 Create branch; 2 search; 3 edit; 4 delete; 5 reload|Each operation persists and deletion removes only the fixture|Would mutate live institute settings|BLOCKED|High|SETUP-ISOLATED-TENANT|
|MOD07-NEG|Branch Management|Validation and permissions|Reject invalid fields and non-admin writes|Disposable owner and teacher accounts|Blank name; malformed contact; teacher role|1 Submit invalid values; 2 attempt write as teacher; 3 verify no row|Invalid values fail and unauthorized role is denied|No safe fixture; no write attempted|BLOCKED|High|SETUP-ROLE-AND-TENANT|

## 8. Course Management
|Test Case ID|Module|Feature|Test Scenario|Preconditions|Test Data|Execution Steps|Expected Result|Actual Result|Status|Severity|Evidence|
|---|---|---|---|---|---|---|---|---|---|---|---|
|MOD08-UI|Course Management|Course list and search|Render course catalog|Owner session|Existing courses|1 Open `/courses`; 2 inspect catalog and search controls|Courses are listed and searchable within institute|Course/subject management page rendered with existing entries|PASS|Medium|PW-ROUTE-MAIN|
|MOD08-CRUD|Course Management|CRUD persistence|Create, edit, search, and delete a course|Disposable institute|Synthetic course and standard|1 Create; 2 search; 3 edit; 4 delete; 5 reload|Changes persist and deleted fixture is absent|Live academic structure write prohibited|BLOCKED|High|SETUP-ISOLATED-TENANT|
|MOD08-NEG|Course Management|Boundary validation|Reject blank/duplicate course and negative fee|Disposable course fixture|Blank title; duplicate code; negative fee|1 Submit each boundary value; 2 check UI and row count|No invalid course persists and a specific validation appears|Not run in read-only pass|NOT RUN|Medium|NOT-EXECUTED|

## 9. Subject Management
|Test Case ID|Module|Feature|Test Scenario|Preconditions|Test Data|Execution Steps|Expected Result|Actual Result|Status|Severity|Evidence|
|---|---|---|---|---|---|---|---|---|---|---|---|
|MOD09-UI|Subject Management|Course-subject listing|Inspect subjects under courses|Owner session and course data|Existing subjects|1 Open `/courses`; 2 inspect subject controls and association|Subjects are associated with the selected course|Combined course/subject management page rendered|PASS|Medium|PW-ROUTE-MAIN|
|MOD09-CRUD|Subject Management|CRUD persistence|Create, edit, and delete a subject fixture|Disposable course|Synthetic subject name and code|1 Create under course; 2 edit code; 3 delete; 4 reload|Subject relationship persists and deletion affects only fixture|Live academic write prohibited|BLOCKED|High|SETUP-ISOLATED-TENANT|
|MOD09-NEG|Subject Management|Validation|Reject missing name and duplicate subject code|Disposable course fixture|Blank name; duplicate code|1 Submit blank; 2 submit duplicate; 3 verify no duplicate row|Both invalid cases are rejected with no unintended row|Not run without fixture|NOT RUN|Medium|NOT-EXECUTED|

## 10. Batch Management
|Test Case ID|Module|Feature|Test Scenario|Preconditions|Test Data|Execution Steps|Expected Result|Actual Result|Status|Severity|Evidence|
|---|---|---|---|---|---|---|---|---|---|---|---|
|MOD10-UI|Batch Management|List and filters|Render batches and status/capacity data|Owner session|Existing batches|1 Open `/batches`; 2 inspect batch list and filters|Batch rows show course/branch/capacity for current institute|Batch management page rendered with existing rows|PASS|Medium|PW-ROUTE-MAIN|
|MOD10-CRUD|Batch Management|CRUD and transfer|Create/edit batch and transfer a disposable student|Disposable institute with course/student|Synthetic batch capacity and student|1 Create batch; 2 edit schedule/capacity; 3 transfer fixture; 4 reload|Batch and transfer persist and counts update exactly once|Live batch/student mutations prohibited|BLOCKED|High|SETUP-ISOLATED-TENANT|
|MOD10-NEG|Batch Management|Capacity and authorization|Reject invalid capacity and unauthorized transfer|Disposable batch and non-admin account|Capacity zero/negative; teacher transfer|1 Submit each capacity; 2 attempt teacher transfer; 3 verify unchanged data|Invalid capacity and unauthorized transfer do not persist|Not run against live rows|BLOCKED|High|SETUP-ROLE-AND-TENANT|

## 11. Student Management
|Test Case ID|Module|Feature|Test Scenario|Preconditions|Test Data|Execution Steps|Expected Result|Actual Result|Status|Severity|Evidence|
|---|---|---|---|---|---|---|---|---|---|---|---|
|MOD11-UI|Student Management|Roster/search/filter|Render student directory and filters|Owner session|Existing roster|1 Open `/students`; 2 inspect search, course, batch and status filters|Roster is institute-scoped and controls filter the visible rows|Student directory rendered with roster, search and filters|PASS|Medium|PW-ROUTE-MAIN|
|MOD11-CRUD|Student Management|Provision/edit/deactivate|Create and edit disposable student then deactivate|Disposable tenant and provisioning function|Synthetic student data|1 Provision student; 2 edit; 3 search; 4 deactivate; 5 reload|Student and linked auth record persist; deactivation is visible|Provisioning would create real auth/profile records|BLOCKED|High|SETUP-ISOLATED-TENANT|
|MOD11-NEG|Student Management|Validation/isolation|Reject invalid data and foreign student IDs|Two tenant fixtures|Invalid ID code; foreign record ID|1 Submit malformed student; 2 request foreign student; 3 re-read|Invalid input fails and foreign record is denied|No isolated fixture|BLOCKED|Critical|SETUP-TWO-TENANTS|

## 12. Teacher Management
|Test Case ID|Module|Feature|Test Scenario|Preconditions|Test Data|Execution Steps|Expected Result|Actual Result|Status|Severity|Evidence|
|---|---|---|---|---|---|---|---|---|---|---|---|
|MOD12-UI|Teacher Management|Roster/search|Render teacher roster and filters|Owner session|Existing staff rows|1 Open `/teachers`; 2 inspect roster and status controls|Only institute teachers appear and filters select the expected rows|Teacher roster rendered with existing entries|PASS|Medium|PW-ROUTE-MAIN|
|MOD12-CRUD|Teacher Management|Provision/edit/status|Provision and update disposable teacher|Disposable tenant and provisioning function|Synthetic teacher data|1 Provision; 2 edit; 3 deactivate; 4 reload and verify linkage|Teacher profile/auth relationship and status persist|Would create live auth/profile data|BLOCKED|High|SETUP-ISOLATED-TENANT|
|MOD12-NEG|Teacher Management|Validation/escalation|Reject invalid staff data and teacher management access|Disposable teacher account|Missing name; invalid salary; self-escalation|1 Submit malformed record; 2 access staff management as teacher|No invalid record persists and teacher cannot administer staff|Teacher fixture unavailable|BLOCKED|Critical|SETUP-TEACHER-FIXTURE|

## 13. Teacher Assignments
|Test Case ID|Module|Feature|Test Scenario|Preconditions|Test Data|Execution Steps|Expected Result|Actual Result|Status|Severity|Evidence|
|---|---|---|---|---|---|---|---|---|---|---|---|
|MOD13-UI|Teacher Assignments|Assignment visibility|Verify assignment appears for teacher and owner|Teacher/batch/subject fixtures|One active assignment|1 Create assignment; 2 refresh owner; 3 view teacher batches|Assignment persists and is visible only to authorized users|Teacher fixture and write permission unavailable|BLOCKED|High|SETUP-ISOLATED-ASSIGNMENT|
|MOD13-CRUD|Teacher Assignments|Create/update/delete|Exercise assignment lifecycle on disposable data|Disposable teacher, subject and batch|Active assignment|1 Create; 2 change status; 3 restore; 4 delete; 5 reload|Each operation persists and only selected assignment changes|No test assignment was created|BLOCKED|High|SETUP-ISOLATED-ASSIGNMENT|
|MOD13-NEG|Teacher Assignments|Duplicate/scope|Reject duplicate assignment and foreign batch access|Two tenant fixtures|Repeated active tuple; foreign batch ID|1 Submit duplicate; 2 read/write foreign assignment; 3 re-read|Duplicate and cross-tenant access are denied|No teacher or second tenant fixture|BLOCKED|Critical|SETUP-TWO-TENANTS|

## 14. Student Enrollment
|Test Case ID|Module|Feature|Test Scenario|Preconditions|Test Data|Execution Steps|Expected Result|Actual Result|Status|Severity|Evidence|
|---|---|---|---|---|---|---|---|---|---|---|---|
|MOD14-UI|Student Enrollment|Existing batch persistence|Check assigned batch on roster before/after reload|Owner session and an already-assigned student|Existing relation only|1 Open roster; 2 note batch label; 3 reload; 4 verify same label|Assigned batch remains consistent after refresh|Existing assigned batch label remained visible after refresh|PASS|Medium|PW-BATCH-REFRESH|
|MOD14-CRUD|Student Enrollment|Assign/transfer|Assign disposable student and verify student/teacher views|Disposable student, teacher and batch|Synthetic enrollment|1 Assign batch; 2 reload; 3 inspect student profile and assigned-teacher view|All views show the same persisted batch relation|No disposable student/teacher records|BLOCKED|High|SETUP-ISOLATED-ENROLLMENT|
|MOD14-NEG|Student Enrollment|Duplicate/tenant scope|Reject duplicate enrollment and foreign institute batch|Two tenant fixtures|Duplicate active row; foreign batch|1 Submit duplicate; 2 attempt foreign batch; 3 verify no new relation|Duplicate and cross-tenant assignments are denied|No tenant pair or write attempted|BLOCKED|Critical|SETUP-TWO-TENANTS|

## 15. Attendance
|Test Case ID|Module|Feature|Test Scenario|Preconditions|Test Data|Execution Steps|Expected Result|Actual Result|Status|Severity|Evidence|
|---|---|---|---|---|---|---|---|---|---|---|---|
|MOD15-UI|Attendance|Status controls|Change present/absent/late without saving|Owner attendance page|Unsaved status overrides|1 Open `/attendance`; 2 note count; 3 set one absent; 4 set late|Status buttons and count update without a database write|Count changed 7/7 to 6/7 to 7/7; no save clicked|PASS|Medium|PW-ATTENDANCE-UNSAVED|
|MOD15-CRUD|Attendance|Save/edit/duplicate|Persist status, edit it and enforce duplicate prevention|Disposable student/batch/date fixture|Present, absent and late on fixture date|1 Save; 2 reload; 3 edit; 4 save same student/date again; 5 inspect row count|Latest status persists and exactly one row exists per defined unique key|Live learner history would be modified; no isolated tenant|BLOCKED|High|SETUP-ISOLATED-ATTENDANCE|
|MOD15-NEG|Attendance|Teacher scope/percentage|Compare assigned batch access and percentage calculation|Teacher and known attendance fixture|Known status counts across assigned/unassigned batches|1 Login teacher; 2 request unassigned batch; 3 compare displayed percentage with independent ratio|Teacher sees assigned scope only and percentage equals present+late over total|Teacher login unavailable; earlier read-only report showed 17/22 = 77%|BLOCKED|Critical|SETUP-TEACHER-ATTENDANCE|

## 16. Timetable
|Test Case ID|Module|Feature|Test Scenario|Preconditions|Test Data|Execution Steps|Expected Result|Actual Result|Status|Severity|Evidence|
|---|---|---|---|---|---|---|---|---|---|---|---|
|MOD16-UI|Timetable|Existing persistence|Verify existing session date and times after refresh|Owner session and existing session|Existing session only|1 Open timetable; 2 select its day; 3 inspect edit values; 4 reload; 5 inspect again|Stored date/start/end remain unchanged|Existing session and edit form retained stored date/times after refresh|PASS|Medium|PW-TIMETABLE-REFRESH|
|MOD16-CRUD|Timetable|Create/edit|Create and update isolated schedule|Disposable batch, teacher and assignment|Synthetic date/time/room|1 Create session; 2 reload; 3 edit time/topic; 4 reload; 5 compare values|Create and update persist once with exact submitted date/time|Live schedule write prohibited|BLOCKED|High|SETUP-ISOLATED-SCHEDULE|
|MOD16-NEG|Timetable|Conflict checks|Check same-date overlap, other-date recurrence, boundary touch and edit self|Node built-in test runner|Existing synthetic session and four candidate cases|1 Run `node --test`; 2 assert four cases|Same-date overlap conflicts; different date, touching times, and self-edit do not conflict|Four focused tests passed; fresh browser helper returned 3 same-date and 0 different-date conflicts|PASS|High|NODE-SCHEDULE-TESTS; PW-CONFLICT-HELPER|

## 17. Homework
|Test Case ID|Module|Feature|Test Scenario|Preconditions|Test Data|Execution Steps|Expected Result|Actual Result|Status|Severity|Evidence|
|---|---|---|---|---|---|---|---|---|---|---|---|
|MOD17-UI|Homework|List and filter|Render homework and batch filters|Owner session|Existing homework data|1 Open `/homework`; 2 inspect list and batch filters|Homework list and filters render|Homework management page rendered with batch filters|PASS|Medium|PW-ROUTE-MAIN|
|MOD17-CRUD|Homework|Create/edit/target|Create assignment and verify target student after reload|Disposable teacher/student/batch|Synthetic title and due date|1 Create homework; 2 edit; 3 reload; 4 inspect as target student|Homework persists and only the target audience sees it|No disposable audience; no write|BLOCKED|High|SETUP-ISOLATED-ACADEMIC|
|MOD17-NEG|Homework|Validation/scope|Reject missing fields and unassigned batch|Teacher fixture|Blank title; unassigned batch|1 Submit invalid form; 2 submit unassigned batch; 3 verify rows|Invalid or unauthorized homework is not persisted|Not run without teacher fixture|BLOCKED|High|SETUP-TEACHER-FIXTURE|

## 18. Tests
|Test Case ID|Module|Feature|Test Scenario|Preconditions|Test Data|Execution Steps|Expected Result|Actual Result|Status|Severity|Evidence|
|---|---|---|---|---|---|---|---|---|---|---|---|
|MOD18-UI|Tests|Assessment list|Render test list and filters|Owner session|Existing tests|1 Open `/tests`; 2 inspect list/status/filter controls|Assessment list and supported controls render|Exams and Assessments page rendered|PASS|Medium|PW-ROUTE-MAIN|
|MOD18-CRUD|Tests|Create/publish|Create draft then publish a test|Disposable academic fixture|Synthetic title/date/total marks|1 Create; 2 publish; 3 reload; 4 verify student visibility|Published test persists and reaches intended batch|No disposable fixture; no live test created|BLOCKED|High|SETUP-ISOLATED-ACADEMIC|
|MOD18-NEG|Tests|Boundary/permission|Reject invalid marks/date and student publish|Teacher/student fixture|Negative total; past date; student publish attempt|1 Submit boundary values; 2 attempt student publish; 3 re-read|Invalid test is rejected and student cannot publish|Role fixtures unavailable|BLOCKED|Critical|SETUP-ROLE-ACCOUNTS|

## 19. Results
|Test Case ID|Module|Feature|Test Scenario|Preconditions|Test Data|Execution Steps|Expected Result|Actual Result|Status|Severity|Evidence|
|---|---|---|---|---|---|---|---|---|---|---|---|
|MOD19-UI|Results|Results ledger|Render results and filters|Owner session|Existing results|1 Open `/results`; 2 inspect student/test filters and rows|Results page and filters render|Academic Results page rendered|PASS|Medium|PW-ROUTE-MAIN|
|MOD19-CRUD|Results|Marks calculation|Enter marks and verify student/report value|Disposable student and test|78 of 100|1 Enter marks; 2 save; 3 refresh; 4 compare student and report|Stored marks/percentage/grade agree across views|Would modify live academic history|BLOCKED|High|SETUP-ISOLATED-RESULT|
|MOD19-NEG|Results|Boundary/isolation|Reject out-of-range marks and another student read|Two student fixtures|Negative; total+1; foreign result ID|1 Submit invalid marks; 2 request foreign result; 3 verify response|Invalid marks and foreign result access are denied|No student fixtures|BLOCKED|Critical|SETUP-TWO-STUDENTS|

## 20. Fees
|Test Case ID|Module|Feature|Test Scenario|Preconditions|Test Data|Execution Steps|Expected Result|Actual Result|Status|Severity|Evidence|
|---|---|---|---|---|---|---|---|---|---|---|---|
|MOD20-UI|Fees|Fee ledger|Render fee balances and filters|Owner session|Existing fee rows|1 Open `/fees`; 2 inspect balances; 3 filter student|Visible totals correspond to institute fee rows|Fees and Student Payment Ledger rendered|PASS|Medium|PW-ROUTE-MAIN|
|MOD20-CRUD|Fees|Create/update persistence|Create fee and verify computed due after reload|Disposable student fixture|Total 1000; discount 100; due date|1 Create fee; 2 reload; 3 edit; 4 verify totals|Fee persists and due equals total less payments/discount rules|Live financial records not modified|BLOCKED|Critical|SETUP-ISOLATED-FINANCE|
|MOD20-NEG|Fees|Validation/scope|Reject negative amount and foreign student fee|Two tenant fixtures|Negative fee; foreign student ID|1 Submit negative; 2 request foreign student fee; 3 verify unchanged rows|Invalid amount and foreign access are denied|No safe finance fixture|BLOCKED|Critical|SETUP-TWO-TENANTS|

## 21. Payments
|Test Case ID|Module|Feature|Test Scenario|Preconditions|Test Data|Execution Steps|Expected Result|Actual Result|Status|Severity|Evidence|
|---|---|---|---|---|---|---|---|---|---|---|---|
|MOD21-UI|Payments|Register/receipt|Render transactions and receipt actions|Owner session|Existing payments|1 Open `/payments`; 2 inspect rows/totals/receipt actions|Transactions and available receipts render consistently|Payment Collections and Receipt Register rendered|PASS|Medium|PW-ROUTE-MAIN|
|MOD21-CRUD|Payments|Payment persistence|Record payment and reconcile fee due|Disposable fee fixture|Payment 100 by cash|1 Record payment; 2 reload; 3 verify fee balance and receipt|Payment is stored once and due decreases by exact amount|Live money data not changed|BLOCKED|Critical|SETUP-ISOLATED-FINANCE|
|MOD21-NEG|Payments|Boundaries/permissions|Reject zero, negative, overpayment and student write|Disposable fee and student account|0; -1; amount above due|1 Submit each amount; 2 try student role; 3 compare ledger|Invalid/unauthorized payment leaves ledger unchanged|No live financial mutation attempted|BLOCKED|Critical|SETUP-ISOLATED-FINANCE|

## 22. Invoices
|Test Case ID|Module|Feature|Test Scenario|Preconditions|Test Data|Execution Steps|Expected Result|Actual Result|Status|Severity|Evidence|
|---|---|---|---|---|---|---|---|---|---|---|---|
|MOD22-UI|Invoices|Invoice view|Open invoice and inspect linked fee lines|Owner session and disposable invoice|Synthetic invoice with one fee line|1 Open invoice action; 2 inspect number, student, line total|Invoice references selected student and correct fee items|Invoice workflow not opened during this run|BLOCKED|High|SETUP-ISOLATED-INVOICE|
|MOD22-CRUD|Invoices|Generate/export|Generate PDF and verify downloaded totals|Disposable invoice fixture|Synthetic invoice number and totals|1 Generate; 2 download; 3 inspect PDF contents|PDF includes correct number, line items, and balanced total|No invoice fixture generated|BLOCKED|Medium|SETUP-ISOLATED-INVOICE|
|MOD22-NEG|Invoices|Authorization|Reject foreign student or stale fee invoice|Two tenant fixtures|Foreign student/fee IDs|1 Request invoice for foreign ID; 2 inspect response and content|Foreign invoice details are denied|No second tenant fixture|BLOCKED|Critical|SETUP-TWO-TENANTS|

## 23. Expenses
|Test Case ID|Module|Feature|Test Scenario|Preconditions|Test Data|Execution Steps|Expected Result|Actual Result|Status|Severity|Evidence|
|---|---|---|---|---|---|---|---|---|---|---|---|
|MOD23-UI|Expenses|Expense tracking|Render expense controls and finance summary|Owner session|Existing read-only finance totals|1 Open `/finance`; 2 inspect expense controls and summary|Authorized owner sees expense tracking and summaries|Finance and Expense Tracking page rendered|PASS|Medium|PW-ROUTE-MAIN|
|MOD23-CRUD|Expenses|CRUD/reconciliation|Create, edit, delete fixture expense and reconcile|Disposable finance fixture|Amount 25; category supplies|1 Create; 2 edit; 3 reload; 4 delete; 5 compare P&L|Each mutation persists and report shifts by exact amount|Live financial data was not changed|BLOCKED|Critical|SETUP-ISOLATED-FINANCE|
|MOD23-NEG|Expenses|Amount/permission|Reject negative amount and student write|Disposable fixture and student account|Negative amount; student role|1 Submit negative; 2 attempt student write; 3 verify no row|Invalid and unauthorized expense writes are denied|No fixture or write|BLOCKED|Critical|SETUP-ROLE-AND-TENANT|

## 24. Payroll
|Test Case ID|Module|Feature|Test Scenario|Preconditions|Test Data|Execution Steps|Expected Result|Actual Result|Status|Severity|Evidence|
|---|---|---|---|---|---|---|---|---|---|---|---|
|MOD24-UI|Payroll|Payroll register|Render staff and period controls|Owner session|Existing staff rows|1 Open `/payroll`; 2 inspect period, salary and payout controls|Authorized payroll page renders expected controls|Faculty and Staff Payroll page rendered|PASS|Medium|PW-ROUTE-MAIN|
|MOD24-CRUD|Payroll|Calculation/payout|Create payroll and verify calculated net and payout|Disposable payroll fixture|Base 1000; allowance 100; deduction 50|1 Create row; 2 calculate; 3 payout; 4 reload|Net is 1050 and payout state persists|No live payroll mutation|BLOCKED|Critical|SETUP-ISOLATED-PAYROLL|
|MOD24-NEG|Payroll|Bounds/role|Reject negative salary and teacher/student payroll access|Disposable staff and student fixtures|Negative salary; non-admin role|1 Submit negative; 2 open payroll as non-admin; 3 inspect API denial|Invalid salary and unauthorized access are denied|No non-admin fixture|BLOCKED|Critical|SETUP-ROLE-ACCOUNTS|

## 25. Announcements
|Test Case ID|Module|Feature|Test Scenario|Preconditions|Test Data|Execution Steps|Expected Result|Actual Result|Status|Severity|Evidence|
|---|---|---|---|---|---|---|---|---|---|---|---|
|MOD25-UI|Announcements|Communication center|Render announcements and audience controls|Owner session|Existing announcements|1 Open `/communication`; 2 inspect notice list and audience controls|Announcements render with supported targeting controls|Communication Center rendered|PASS|Medium|PW-ROUTE-MAIN|
|MOD25-CRUD|Announcements|Publish/target|Publish notice for one batch and verify recipient|Disposable student/batch|Synthetic notice|1 Create targeted notice; 2 publish; 3 view as student; 4 reload|Only the intended audience sees a persisted notice|No disposable recipient and no write|BLOCKED|High|SETUP-ISOLATED-COMMUNICATION|
|MOD25-NEG|Announcements|Permission/safe text|Reject unauthorized publish and unsafe content|Teacher/student fixture|Script-like body; student publish|1 Submit unsafe content; 2 attempt as student; 3 inspect rendered content and response|Unauthorized publish is denied and content is safely rendered|No role fixtures or write|BLOCKED|Critical|SETUP-ROLE-ACCOUNTS|

## 26. Notifications
|Test Case ID|Module|Feature|Test Scenario|Preconditions|Test Data|Execution Steps|Expected Result|Actual Result|Status|Severity|Evidence|
|---|---|---|---|---|---|---|---|---|---|---|---|
|MOD26-UI|Notifications|Student notification center|Render own notifications and read state|Student account and notifications|One read and one unread own notification|1 Sign in as student; 2 open `/notifications`; 3 compare recipient IDs|Only that student’s notifications appear with correct read state|Owner was redirected to `/dashboard`; student account unavailable|BLOCKED|High|PW-WRONG-ROLE|
|MOD26-CRUD|Notifications|Create/read|Deliver scoped notification and mark read|Disposable student recipient|Synthetic scoped notification|1 Trigger allowed sender; 2 open notification; 3 mark read; 4 reload|Notification persists and read state remains updated|No recipient fixture or notification created|BLOCKED|High|SETUP-ISOLATED-NOTIFICATION|
|MOD26-NEG|Notifications|Recipient isolation|Attempt to read/update another student’s notification|Two student fixtures|Notification owned by student A|1 Sign in as B; 2 request A notification; 3 try mark read|Content and mutation are denied|Two student accounts unavailable|BLOCKED|Critical|SETUP-TWO-STUDENTS|

## 27. Reports & Analytics
|Test Case ID|Module|Feature|Test Scenario|Preconditions|Test Data|Execution Steps|Expected Result|Actual Result|Status|Severity|Evidence|
|---|---|---|---|---|---|---|---|---|---|---|---|
|MOD27-UI|Reports & Analytics|Summary views|Render both reporting modules|Owner session|Existing read-only records|1 Open `/reports`; 2 open `/analytics`; 3 inspect summary panels|Both pages render report summaries and filter controls|Reports Hub and Analytics pages rendered|PASS|Medium|PW-ROUTE-MAIN|
|MOD27-CRUD|Reports & Analytics|Filters/export|Filter period and export CSV/PDF|Owner session and data|All-time and 30-day period|1 Change period; 2 compare rows; 3 export; 4 inspect export|Export matches visible filtered data and totals|Export/reconciliation not exercised|BLOCKED|Medium|SETUP-REPORT-ASSERTIONS|
|MOD27-NEG|Reports & Analytics|Calculation check|Compare summary against independent fixture aggregates|Fixture with known values|Known attendance/payment/expense totals|1 Compute independent totals; 2 compare report; 3 reload|Every reported total matches source rows and defined rounding|No independent isolated fixture was prepared|NOT RUN|High|NOT-EXECUTED|

## 28. AI Copilot
|Test Case ID|Module|Feature|Test Scenario|Preconditions|Test Data|Execution Steps|Expected Result|Actual Result|Status|Severity|Evidence|
|---|---|---|---|---|---|---|---|---|---|---|---|
|MOD28-UI|AI Copilot|Safe prompt|Open assistant and ask supported read-only question|Owner session and AI sandbox|Prompt asks for student count|1 Open Copilot; 2 send prompt; 3 record answer/error|Assistant answers with authorized data and no unrelated records|AI request not run to avoid an unisolated external data call|BLOCKED|High|SETUP-AI-SANDBOX|
|MOD28-CRUD|AI Copilot|Role boundary|Request finance data as teacher and student|Teacher/student fixtures and AI sandbox|Prompt asks for institute revenue|1 Send prompt as each role; 2 inspect answer and backend scope|Non-admin roles receive no finance figures or records|No role sessions or AI sandbox|BLOCKED|Critical|SETUP-AI-ROLE-FIXTURES|
|MOD28-NEG|AI Copilot|Prompt injection|Attempt instruction override and tenant extraction|Isolated AI staging tenant|Synthetic override and foreign-tenant request|1 Submit injection; 2 inspect answer and backend requests; 3 verify no foreign rows|Prompt cannot bypass server role/tenant authorization|Not executed without safe AI sandbox|BLOCKED|Critical|SETUP-AI-SANDBOX|

## 29. Settings
|Test Case ID|Module|Feature|Test Scenario|Preconditions|Test Data|Execution Steps|Expected Result|Actual Result|Status|Severity|Evidence|
|---|---|---|---|---|---|---|---|---|---|---|---|
|MOD29-UI|Settings|Settings sections|Render institute and account settings|Owner session|Current institute settings|1 Open `/settings`; 2 inspect institute, staff, profile sections|Authorized settings sections render|Admin & Institute Settings rendered|PASS|Medium|PW-ROUTE-MAIN|
|MOD29-CRUD|Settings|Save/persistence|Update a disposable setting and verify reload|Disposable institute|Synthetic contact value|1 Change value; 2 save; 3 reload; 4 compare|New setting persists for fixture institute|Live configuration was not changed|BLOCKED|High|SETUP-ISOLATED-INSTITUTE|
|MOD29-NEG|Settings|Validation/permissions|Reject malformed values and non-admin save|Disposable settings fixture and student|Malformed email; student write|1 Submit malformed value; 2 attempt save as student|Invalid value and unauthorized update are rejected|Student account unavailable|BLOCKED|Critical|SETUP-ROLE-ACCOUNTS|

## 30. Profile
|Test Case ID|Module|Feature|Test Scenario|Preconditions|Test Data|Execution Steps|Expected Result|Actual Result|Status|Severity|Evidence|
|---|---|---|---|---|---|---|---|---|---|---|---|
|MOD30-UI|Profile|Student profile|Render own details and assigned batch name|Student session and linked student row|Assigned student and unassigned student|1 Sign in as student; 2 open `/profile`; 3 inspect own profile and batch label|Profile shows own data and actual batch name or Unassigned|Owner role was redirected away; student session unavailable|BLOCKED|High|SETUP-STUDENT-ACCOUNT|
|MOD30-CRUD|Profile|Allowed personal update|Update own permitted contact field and reload|Disposable student account|Synthetic own contact update|1 Edit allowed field; 2 save; 3 reload; 4 compare value|Allowed field persists; role and institute fields are immutable|No student fixture|BLOCKED|Critical|SETUP-STUDENT-ACCOUNT|
|MOD30-NEG|Profile|Unassigned fallback|Verify batch fallback for student with null batch|Disposable student without batch|`batch_id=null`|1 Open own profile; 2 inspect batch row|Profile displays Unassigned and no unrelated batch name|Not run without student login|BLOCKED|Medium|SETUP-STUDENT-ACCOUNT|

## 31. Automation
|Test Case ID|Module|Feature|Test Scenario|Preconditions|Test Data|Execution Steps|Expected Result|Actual Result|Status|Severity|Evidence|
|---|---|---|---|---|---|---|---|---|---|---|---|
|MOD31-UI|Automation|Scheduled job inventory|Verify a supported scheduler or background job exists|Repository and deployment configuration|Implemented automation inventory|1 Inspect supported automation entry points; 2 confirm scheduler configuration|Only documented implemented automation is tested|No scheduled-job module/trigger implementation was identified in the inspected project materials|N/A|Low|FEATURE-INVENTORY|
|MOD31-CRUD|Automation|App-level notification|Verify a supported event-triggered notification|Disposable recipient and provider sandbox|Synthetic event and recipient|1 Trigger supported action; 2 inspect delivery record; 3 verify recipient|Supported event produces exactly one scoped delivery|Requires live attendance write and recipient/provider fixture|BLOCKED|High|SETUP-ISOLATED-AUTOMATION|
|MOD31-NEG|Automation|Scheduled retry|Test retry of a scheduled task|Documented scheduler and retry contract|Synthetic provider outage|1 Inject failure; 2 retry; 3 inspect delivery count|Retries follow configured schedule and suppress duplicates|No scheduled task/retry feature is implemented|N/A|Low|UNSUPPORTED-SCHEDULER|

## 32. Responsive UI
|Test Case ID|Module|Feature|Test Scenario|Preconditions|Test Data|Execution Steps|Expected Result|Actual Result|Status|Severity|Evidence|
|---|---|---|---|---|---|---|---|---|---|---|---|
|MOD32-UI|Responsive UI|Overflow|Check timetable at phone/tablet/desktop widths|Browser on timetable route|390px; 768px; 1440px|1 Set each width; 2 compare document scroll and client width|No horizontal overflow at each tested width|No overflow at all three sampled widths|PASS|Medium|PW-RESPONSIVE|
|MOD32-CRUD|Responsive UI|Form layout|Check key forms and dialogs remain operable on narrow screens|Browser and read-only form access|390px and 768px|1 Open forms without submitting; 2 inspect clipping and reachable controls|All relevant controls remain visible and operable|Other forms were not swept|NOT RUN|Medium|NOT-EXECUTED|
|MOD32-NEG|Responsive UI|Narrow boundary|Check 320px and very long labels|Browser and synthetic display text|320px; long unbroken string|1 Set 320px; 2 inspect text wrapping and overflow|No critical controls are hidden by overflow|Not executed|NOT RUN|Low|NOT-EXECUTED|

## 33. Performance
|Test Case ID|Module|Feature|Test Scenario|Preconditions|Test Data|Execution Steps|Expected Result|Actual Result|Status|Severity|Evidence|
|---|---|---|---|---|---|---|---|---|---|---|---|
|MOD33-UI|Performance|Cold-load SLA|Measure cold page load against agreed SLA|Cold browser and defined SLA|Dashboard and one large module|1 Clear cache; 2 load route; 3 record LCP/resources|Load time meets agreed SLA and critical resources succeed|No SLA or cold trace supplied|NOT RUN|Medium|NO-SLA|
|MOD33-CRUD|Performance|Maximum dataset|Measure large roster/list rendering|Disposable maximum-size fixture|Documented maximum rows|1 Seed fixture; 2 load list; 3 measure render/memory|Application remains responsive at agreed volume|No max-volume fixture or SLA|BLOCKED|Medium|SETUP-PERFORMANCE-FIXTURE|
|MOD33-NEG|Performance|Slow/error recovery|Delay APIs and verify bounded loading/recovery|Mock API harness|Two-second latency and timeout|1 Delay response; 2 navigate away; 3 inspect recovery and stale state|Loading is bounded and errors do not expose stale records|No Playwright network-mocking config established|NOT RUN|Medium|NO-PLAYWRIGHT-HARNESS|

## 34. Error Handling
|Test Case ID|Module|Feature|Test Scenario|Preconditions|Test Data|Execution Steps|Expected Result|Actual Result|Status|Severity|Evidence|
|---|---|---|---|---|---|---|---|---|---|---|---|
|MOD34-UI|Error Handling|Backend outage|Force profile and API failures safely|Isolated mock/staging API|Timeout; 500; malformed response|1 Inject each response; 2 inspect error UI; 3 retry|Actionable error renders and no false success occurs|Logout request aborted during navigation; server result unknown|BLOCKED|High|PW-LOGOUT-NETWORK|
|MOD34-CRUD|Error Handling|Failed mutation|Force failed create/update and verify no false success|Mock API and disposable records|HTTP 500 on mutation|1 Submit valid fixture; 2 return 500; 3 inspect toast and stored state|Failure is visible and no partial/duplicate record remains|No mutation tests run on live institute|BLOCKED|High|SETUP-MOCK-API|
|MOD34-NEG|Error Handling|Malformed inputs|Reject invalid date/time/numeric values|Disposable form session|Invalid date; end before start; nonnumeric amount|1 Submit each invalid value; 2 inspect validation and persistence|Invalid values are rejected without stored changes|Not exercised|NOT RUN|Medium|NOT-EXECUTED|

## 35. Multi-Tenant Isolation
|Test Case ID|Module|Feature|Test Scenario|Preconditions|Test Data|Execution Steps|Expected Result|Actual Result|Status|Severity|Evidence|
|---|---|---|---|---|---|---|---|---|---|---|---|
|MOD35-UI|Multi-Tenant Isolation|Tenant reads|Verify tenant A cannot read tenant B objects|Two isolated institutes and accounts|Synthetic A/B records|1 Sign in as A; 2 request B row IDs across modules; 3 inspect rows|No B records are returned to A|Only one real institute context; second tenant not created|BLOCKED|Critical|SETUP-TWO-TENANTS|
|MOD35-CRUD|Multi-Tenant Isolation|Cross-tenant writes|Attempt foreign IDs in create/update paths|Two disposable institutes and roles|Foreign student, batch, fee and schedule IDs|1 Attempt authenticated cross-tenant writes; 2 re-read both tenants|Backend denies all cross-tenant writes and neither tenant changes|No SQL/API writes or second tenant fixture permitted|BLOCKED|Critical|SETUP-TWO-TENANTS|
|MOD35-NEG|Multi-Tenant Isolation|Nested relationship scope|Check joined profiles, teachers and assignments do not leak|Two tenants with fixtures|Foreign teacher assignment and student IDs|1 Query nested relations as A; 2 compare B-only records|Related objects remain tenant-scoped|Not tested without tenant pair|BLOCKED|Critical|SETUP-TWO-TENANTS|

## E2E-001: Student Admission
|Test Case ID|Module|Feature|Test Scenario|Preconditions|Test Data|Execution Steps|Expected Result|Actual Result|Status|Severity|Evidence|
|---|---|---|---|---|---|---|---|---|---|---|---|
|E2E-001|Student Admission E2E|Enquiry to dashboard|Create enquiry, student, batch assignment and verify counts|Disposable institute and provisioning function|Synthetic enquiry/student/batch|1 Create enquiry; 2 convert; 3 assign batch; 4 verify student profile; 5 compare dashboard count|One student and one enrollment persist; dashboard count increments once|Would create live auth/student records; isolated tenant unavailable|BLOCKED|Critical|SETUP-ISOLATED-TENANT|

## E2E-002: Academic Setup
|Test Case ID|Module|Feature|Test Scenario|Preconditions|Test Data|Execution Steps|Expected Result|Actual Result|Status|Severity|Evidence|
|---|---|---|---|---|---|---|---|---|---|---|---|
|E2E-002|Academic Setup E2E|Course through assignment|Create course, subject, batch and teacher assignment|Disposable institute and teacher fixture|Synthetic course/subject/batch/teacher|1 Create course; 2 subject; 3 batch; 4 assignment; 5 verify teacher visibility|All relations persist and only assigned teacher sees batch|No isolated academic/teacher fixtures|BLOCKED|Critical|SETUP-ISOLATED-TENANT|

## E2E-003: Attendance
|Test Case ID|Module|Feature|Test Scenario|Preconditions|Test Data|Execution Steps|Expected Result|Actual Result|Status|Severity|Evidence|
|---|---|---|---|---|---|---|---|---|---|---|---|
|E2E-003|Attendance E2E|Teacher mark/save/report|Mark attendance and verify after reload|Disposable teacher, student, batch and date|Known present/absent/late rows|1 Login teacher; 2 open assigned batch; 3 mark/save; 4 refresh; 5 verify records and percentage|Rows persist once and percentage matches independent calculation|Would alter live learner history; blocked|BLOCKED|Critical|SETUP-ISOLATED-ATTENDANCE|

## E2E-004: Timetable
|Test Case ID|Module|Feature|Test Scenario|Preconditions|Test Data|Execution Steps|Expected Result|Actual Result|Status|Severity|Evidence|
|---|---|---|---|---|---|---|---|---|---|---|---|
|E2E-004|Timetable E2E|Session lifecycle|Create, reload, edit and test conflicts|Disposable assignment and session fixture|Synthetic dates and overlapping/non-overlapping times|1 Create; 2 reload; 3 edit; 4 reload; 5 test date-aware conflict|Date/time persist and only same-date resource overlaps fail|Pure conflict tests passed; live create/edit blocked|BLOCKED|High|SETUP-ISOLATED-SCHEDULE|

## E2E-005: Examination
|Test Case ID|Module|Feature|Test Scenario|Preconditions|Test Data|Execution Steps|Expected Result|Actual Result|Status|Severity|Evidence|
|---|---|---|---|---|---|---|---|---|---|---|---|
|E2E-005|Examination E2E|Test through report|Create/publish test, enter marks and inspect report|Disposable teacher/student/test fixtures|Synthetic test; marks 78/100|1 Create test; 2 publish; 3 enter marks; 4 verify student and report|Marks, percentage and grade agree after reload|Would mutate academic records; blocked|BLOCKED|Critical|SETUP-ISOLATED-ACADEMIC|

## E2E-006: Fee Collection
|Test Case ID|Module|Feature|Test Scenario|Preconditions|Test Data|Execution Steps|Expected Result|Actual Result|Status|Severity|Evidence|
|---|---|---|---|---|---|---|---|---|---|---|---|
|E2E-006|Fee Collection E2E|Fee/payment/invoice|Create fee, pay, generate invoice and reconcile|Disposable student and finance fixture|Fee 1000; payment 250|1 Create fee; 2 record payment; 3 verify due; 4 invoice; 5 compare report|Due is 750 and invoice/report reconcile|Live money records not changed|BLOCKED|Critical|SETUP-ISOLATED-FINANCE|

## E2E-007: Communication
|Test Case ID|Module|Feature|Test Scenario|Preconditions|Test Data|Execution Steps|Expected Result|Actual Result|Status|Severity|Evidence|
|---|---|---|---|---|---|---|---|---|---|---|---|
|E2E-007|Communication E2E|Target/publish/read|Publish targeted notice and verify student read state|Disposable recipient and provider sandbox|Synthetic notice for one batch|1 Publish; 2 login target student; 3 read; 4 reload and verify|Only target sees notice and read state persists|No disposable recipient/provider fixture|BLOCKED|High|SETUP-ISOLATED-COMMUNICATION|

## E2E-008: Multi-Tenant Isolation
|Test Case ID|Module|Feature|Test Scenario|Preconditions|Test Data|Execution Steps|Expected Result|Actual Result|Status|Severity|Evidence|
|---|---|---|---|---|---|---|---|---|---|---|---|
|E2E-008|Multi-Tenant E2E|Two-tenant isolation|Create isolated A/B fixtures and test cross-tenant reads/writes|Two disposable institutes and users|Synthetic institute A/B objects|1 Set up A/B; 2 attempt foreign reads/writes; 3 verify denial; 4 clean up|Every foreign request is denied and fixtures are removed|No second tenant and no SQL/data mutation approved|BLOCKED|Critical|SETUP-TWO-TENANTS|

## Security Cases
|Test Case ID|Module|Feature|Test Scenario|Preconditions|Test Data|Execution Steps|Expected Result|Actual Result|Status|Severity|Evidence|
|---|---|---|---|---|---|---|---|---|---|---|---|
|SEC-001|Security|Anonymous access|Request protected routes without auth|Fresh browser context|Dashboard, student, teacher, finance and profile paths|1 Navigate each URL directly; 2 record final URL|Protected content never renders; route redirects to login|Six protected routes redirected to `/login`|PASS|Critical|PW-AUTH-ANON|
|SEC-002|Security|Wrong role|Owner attempts student-only route|Owner session|`/student`|1 Open route; 2 record final path and main page|Student portal is not rendered; owner returns to allowed dashboard|Redirected to `/dashboard`|PASS|High|PW-WRONG-ROLE|
|SEC-003|Security|Teacher assignment boundary|Request unassigned batch as teacher|Teacher plus assigned/unassigned batch fixtures|Unassigned batch ID|1 Sign in teacher; 2 request batch; 3 inspect API and UI|No unassigned data returned and write denied|Teacher fixture unavailable|BLOCKED|Critical|SETUP-TEACHER-AND-BATCH|
|SEC-004|Security|Student isolation|Request another student’s profile/results|Two student fixtures|Foreign student/result IDs|1 Sign in A; 2 request B IDs; 3 inspect responses|Foreign rows denied or empty|Student fixtures unavailable|BLOCKED|Critical|SETUP-TWO-STUDENTS|
|SEC-005|Security|Student finance boundary|Request institute finance/payroll and foreign fee as student|Student and finance fixtures|Foreign fee/payroll IDs|1 Sign in student; 2 request finance and foreign fee routes/API|No institute finance or other student records are returned|Student session unavailable|BLOCKED|Critical|SETUP-STUDENT-ACCOUNT|
|SEC-006|Security|Cross-tenant authorization|Request foreign institute rows|Two tenant fixtures|Foreign institute and row IDs|1 Sign in A; 2 request B data across tables|All foreign reads denied/empty|Only one institute context|BLOCKED|Critical|SETUP-TWO-TENANTS|
|SEC-007|Security|Unauthorized mutation|Attempt direct protected-field REST updates|Disposable low-privilege account and staging API|Role, institute ID and financial fields|1 Submit authenticated writes; 2 re-read affected rows|Backend rejects writes and stored values remain unchanged|No direct mutation executed against live DB|BLOCKED|Critical|SETUP-SECURITY-STAGING|
|SEC-008|Security|Session expiry|Request protected API with expired/revoked session|Disposable identity with controlled expiry|Expired access token|1 Expire/revoke test session; 2 access route/API; 3 inspect state|Expired session is rejected and UI returns to login|Controlled test identity unavailable|BLOCKED|High|SETUP-AUTH-STAGING|
|SEC-009|Security|Logout stale session|Verify local clear and server revocation|Owner shared session|Current session|1 Sign out; 2 reopen protected route; 3 inspect logout POST|Local state clears and server confirms revocation|Local redirect and route denial passed; POST aborted so revocation unverified|BLOCKED|Critical|PW-LOGOUT|
|SEC-010|Security|AI boundary|Ask teacher/student for finance information|Role fixtures and AI sandbox|Revenue prompt|1 Submit by each role; 2 inspect response and backend scope|No finance data is exposed to non-admin|No role fixtures or sandbox|BLOCKED|Critical|SETUP-AI-ROLE-FIXTURES|
|SEC-011|Security|Injection|Attempt HTML/script and AI instruction override|Isolated staging environment|Synthetic script and override strings|1 Submit supported text fields; 2 inspect rendering; 3 test AI override|Input is safely rendered and authorization cannot be bypassed|No isolated injection environment|BLOCKED|Critical|SETUP-SECURITY-STAGING|
