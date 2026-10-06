# EduPilot Feature Completion Matrix

**Project:** EduPilot SaaS ERP  
**Date:** 2026-10-04  

---

## Complete Module & Feature Matrix

Key:
- **Status:** `COMPLETE` (100% functional with backend persistence & tests) · `PARTIAL` (Functional with minor static fallbacks)
- **Backend:** FastAPI Endpoint Path
- **Persistence:** Database Table

| Module | Feature / Workflow | Role Access | Backend API Route | DB Table | Status | Notes |
|---|---|---|---|---|---|---|
| **Public Portal** | Landing Page & Public Info | Anonymous | `GET /institutes/public` | `institutes` | COMPLETE | Displays active institute profile & branding. |
| **Public Portal** | Public Enquiry Submission | Anonymous | `POST /institutes/enquiries` | `enquiries` | COMPLETE | Validates phone/name, creates enquiry record. |
| **Auth** | Institute Registration | Anonymous | `POST /auth/register-admin` | `institutes`, `profiles` | COMPLETE | Creates new institute & Admin account with PBKDF2 hash. |
| **Auth** | Multi-Role Login | Owner / Admin / Teacher / Student | `POST /auth/login` | `profiles`, `teachers`, `students` | COMPLETE | Supports Email or ID Code (TCH-*/STU-*). Returns JWT token. |
| **Auth** | Current User Profile | Authenticated | `GET /auth/me` | `profiles` | COMPLETE | Returns role, institute_id, and profile metadata. |
| **Branches** | Branch Management | Owner / Admin | `GET/POST /institutes/branches` | `branches` | COMPLETE | Full CRUD for multi-branch institutes. |
| **Courses** | Course Management | Owner / Admin | `GET/POST /academics/courses` | `courses` | COMPLETE | Standard, board, base fee, duration setup. |
| **Subjects** | Subject Management | Owner / Admin | `GET/POST /academics/subjects` | `subjects` | COMPLETE | Subject assignment linked to courses. |
| **Batches** | Batch Management | Owner / Admin / Teacher | `GET/POST/PUT /academics/batches` | `batches` | COMPLETE | Room number, teacher assignment, capacity tracking. |
| **Students** | Student Provisioning | Owner / Admin | `GET/POST/PUT /students` | `students`, `profiles` | COMPLETE | Auto-generates `STU-*` code & temp password. |
| **Teachers** | Teacher Provisioning | Owner / Admin | `GET/POST/PUT /teachers` | `teachers`, `profiles` | COMPLETE | Auto-generates `TCH-*` code, salary, credentials. |
| **Teacher Portal** | Teacher Self Profile | Teacher | `GET /teachers/me` | `teachers` | COMPLETE | Fetches logged-in teacher record & assigned batches. |
| **Student Portal**| Student Self Profile | Student | `GET /students/me` | `students` | COMPLETE | Fetches logged-in student record & enrolled batch. |
| **Attendance** | Bulk Attendance Marking | Owner / Admin / Teacher | `POST /attendance/bulk` | `attendance` | COMPLETE | Handles present/absent/late/leave with batch auto-fallback. |
| **Attendance** | Attendance History & Roster | All Roles | `GET /attendance` | `attendance` | COMPLETE | Filtered by role, date, student, and batch. |
| **Fees** | Fee Structure Allocation | Owner / Admin | `POST /finance/fees` | `fees` | COMPLETE | Total fee, discount, net due calculation. |
| **Payments** | Payment Recording | Owner / Admin | `POST /finance/payments` | `payments`, `fees` | COMPLETE | Partial & full payments, ledger update, receipt generation. |
| **Finance** | Expense Ledger | Owner / Admin | `GET/POST /finance/expenses` | `expenses` | COMPLETE | Categorized expense tracking. |
| **Finance** | Payroll Management | Owner / Admin | `GET/POST /finance/payroll` | `payroll` | COMPLETE | Base salary, allowances, deductions, duplicate prevention. |
| **Finance** | Financial P&L Summary | Owner / Admin | `GET /finance/summary` | `payments`, `expenses`, `payroll` | COMPLETE | Canonical revenue, expenses, net income, & margin %. |
| **Invoices** | Fee Invoice Listing | All Roles | `GET /finance/invoices` | `invoices` | COMPLETE | Tenant-scoped & student-scoped invoice records. |
| **Homework** | Homework Management | Owner / Admin / Teacher | `GET/POST /academics/homework` | `homework` | COMPLETE | Title, due date, subject, attachment file handling. |
| **Study Material**| Study Material Library | All Roles | `GET/POST /academics/study-materials` | `study_materials` | COMPLETE | Material type, description, and link handling. |
| **Tests & Exam** | Test Creation | Owner / Admin / Teacher | `GET/POST /academics/tests` | `tests` | COMPLETE | Test type, duration, total & passing marks. |
| **Results** | Marks Entry & Report Card| Owner / Admin / Teacher / Student | `GET/POST /academics/results` | `results` | COMPLETE | Calculates percentage, letter grade, and rank. |
| **Timetable** | Class Schedule Grid | All Roles | `GET/POST /academics/schedules` | `schedules` | COMPLETE | Day of week, start/end time, room number. |
| **AI Copilot** | AI Assistant & Tutor | All Roles (Scoped) | `POST /api/v1/ai/tutor` | N/A | COMPLETE | Student financial keyword guard & local demo fallback. |

---

## Legacy Infrastructure & Supabase Dependency Status

- **Authentication:** 100% Migrated to FastAPI JWT (`/api/v1/auth/login`).
- **Data Persistence:** 100% Migrated to FastAPI + PostgreSQL / SQLite via SQLAlchemy.
- **Student & Teacher Portal Hooks:** 100% Migrated to FastAPI (`/students/me`, `/teachers/me`, `/attendance`, `/finance/fees`, `/academics/results`).
- **AI Service:** 100% Migrated to FastAPI (`/api/v1/ai/tutor`).
- **Edge Functions / Supabase Storage:** Legacy storage client preserved as optional fallback; local/external URL support active.
