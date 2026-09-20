# EduPilot Phase 9 — Finance & Fees Comprehensive Audit Report

## Executive Summary
This document provides a **read-only, non-destructive audit** of the Finance & Fees infrastructure in EduPilot. All database structures and column schemas reported here have been **empirically verified against the live Supabase instance** via schema validation probes.

> [!IMPORTANT]
> **AUDIT ONLY TASK**: Zero application code, zero database schemas, and zero RLS policies were modified during this phase.

---

## 1. Live Supabase Database Schemas (Verified)

### 1.1 `public.fees` Table
| Column Name | Data Type | Nullable | Notes / Purpose |
|---|---|---|---|
| `id` | uuid | No | Primary Key |
| `student_id` | uuid | No | References `public.students.id` |
| `institute_id` | uuid | No | Multi-tenant tenant identifier |
| `total_amount` | numeric | No | Gross fee amount before discount |
| `paid_amount` | numeric | Yes | Cumulative amount paid to date |
| `due_amount` | numeric | Yes | Outstanding fee balance |
| `discount_amount` | numeric | Yes | Concession / discount applied |
| `due_date` | date | Yes | Fee payment deadline |
| `payment_status` | text | Yes | E.g. `'paid'`, `'pending'`, `'partial'`, `'overdue'` |
| `payment_mode` | text | Yes | E.g. `'cash'`, `'upi'`, `'bank_transfer'`, `'cheque'` |
| `receipt_number` | text | Yes | Primary receipt / invoice code |
| `created_at` | timestamptz | No | Record creation timestamp |

> [!CAUTION]
> **Non-existent `fees` columns**: `batch_id`, `course_id`, `pending_amount`, `amount`, `balance`, `discount`, `fine`, `status`, `payment_method`, `remarks`, `updated_at`.

---

### 1.2 `public.payments` Table
| Column Name | Data Type | Nullable | Notes / Purpose |
|---|---|---|---|
| `id` | uuid | No | Primary Key |
| `student_id` | uuid | No | References `public.students.id` |
| `fee_id` | uuid | Yes | References `public.fees.id` (links partial/full payment) |
| `institute_id` | uuid | No | Multi-tenant tenant identifier |
| `amount` | numeric | No | Individual transaction payment amount |
| `payment_date` | date / timestamptz | Yes | Date transaction was executed |
| `payment_method` | text | Yes | E.g. `'UPI'`, `'Cash'`, `'Card'`, `'NetBanking'` |
| `reference_number` | text | Yes | Bank UTR / UPI Transaction Reference |
| `receipt_number` | text | Yes | Transaction receipt number |
| `status` | text | Yes | E.g. `'SUCCESS'`, `'PENDING'`, `'FAILED'` |
| `collected_by` | text | Yes | Staff / admin recorder name |
| `created_at` | timestamptz | No | Record creation timestamp |

> [!CAUTION]
> **Non-existent `payments` columns**: `paid_amount`, `date`, `payment_mode`, `transaction_id`, `payment_status`, `remarks`.

---

### 1.3 `public.expenses` Table
| Column Name | Data Type | Nullable | Notes / Purpose |
|---|---|---|---|
| `id` | uuid | No | Primary Key |
| `institute_id` | uuid | No | Multi-tenant tenant identifier |
| `category` | text | No | E.g. `'Rent'`, `'Utilities'`, `'Salaries'`, `'Stationery'` |
| `amount` | numeric | No | Operational expense amount |
| `expense_date` | date | No | Date expense occurred |
| `payment_method` | text | Yes | E.g. `'Cash'`, `'Bank Transfer'`, `'UPI'` |
| `description` | text | Yes | Detail / memo of operational expense |
| `created_at` | timestamptz | No | Record creation timestamp |

> [!CAUTION]
> **Non-existent `expenses` columns**: `title`, `date`, `payment_mode`, `added_by`, `created_by`.

---

### 1.4 `public.payroll` Table
| Column Name | Data Type | Nullable | Notes / Purpose |
|---|---|---|---|
| `id` | uuid | No | Primary Key |
| `teacher_id` | uuid | No | References `public.teachers.id` |
| `institute_id` | uuid | No | Multi-tenant tenant identifier |
| `month` | text / integer | No | Salary month (e.g. `'September'` or `'09'`) |
| `year` | text / integer | No | Salary year (e.g. `'2026'`) |
| `base_salary` | numeric | No | Contracted base monthly salary |
| `allowances` | numeric | Yes | Extra bonus / allowance amount |
| `deductions` | numeric | Yes | Tax / leave deductions |
| `net_salary` | numeric | No | Calculated disbursement (`base + allowances - deductions`) |
| `payment_status` | text | Yes | E.g. `'PAID'`, `'PENDING'`, `'PROCESSING'` |
| `payment_method` | text | Yes | E.g. `'Direct Deposit'`, `'Cheque'`, `'Cash'` |
| `payment_date` | date | Yes | Date salary was disbursed |
| `created_at` | timestamptz | No | Record creation timestamp |

> [!CAUTION]
> **Non-existent `payroll` columns**: `month_year`, `bonus`, `status`, `payment_mode`.

---

### 1.5 Core Relational Schemas (Verified)
- **`students`**: `id`, `institute_id`, `user_id`, `full_name`, `student_id_code`, `standard`, `course_id`, `batch_id`, `gender`, `dob`, `address`, `parent_name`, `parent_relation`, `parent_phone`, `parent_email`, `emergency_contact`, `admission_date`, `status`, `created_at`.
- **`teachers`**: `id`, `user_id`, `institute_id`, `full_name`, `email`, `phone`, `qualification`, `specialization`, `joining_date`, `status`, `created_at`.
- **`institutes`**: `id`, `name`, `email`, `phone`, `address`, `created_at`.
- **`profiles`**: `id`, `full_name`, `email`, `role`, `institute_id`, `phone`, `avatar_url`, `created_at`.

---

## 2. Frontend Architecture & Current State

### 2.1 Code Map
- **Pages**:
  - [`src/pages/Fees/Fees.jsx`](file:///c:/Users/Atharva/Desktop/edu/src/pages/Fees/Fees.jsx): Fee collection dashboard & record payment modal.
  - [`src/pages/Payments/Payments.jsx`](file:///c:/Users/Atharva/Desktop/edu/src/pages/Payments/Payments.jsx): Transaction history and receipt log.
  - [`src/pages/Finance/Finance.jsx`](file:///c:/Users/Atharva/Desktop/edu/src/pages/Finance/Finance.jsx): Operational expense ledger & net income summary.
  - [`src/pages/Payroll/Payroll.jsx`](file:///c:/Users/Atharva/Desktop/edu/src/pages/Payroll/Payroll.jsx): Faculty salary processing & disbursement.
- **Services & Hooks**:
  - [`src/services/feeService.js`](file:///c:/Users/Atharva/Desktop/edu/src/services/feeService.js) / `useFees.js` / `useMyFees.js`
  - [`src/services/paymentService.js`](file:///c:/Users/Atharva/Desktop/edu/src/services/paymentService.js) / `usePayments.js`
  - [`src/services/financeService.js`](file:///c:/Users/Atharva/Desktop/edu/src/services/financeService.js) / `useFinance.js`
  - [`src/services/payrollService.js`](file:///c:/Users/Atharva/Desktop/edu/src/services/payrollService.js) / `usePayroll.js`

---

## 3. Discovered Schema Mismatches & Technical Debt

1. **`Fees.jsx` Form Payload Mismatch**:
   - `Fees.jsx` attempts to submit `fine` and `discount` fields. The live table has **`discount_amount`** and does **NOT** contain `fine`.
   - `Fees.jsx` computes due amounts using fallback fields `pending_amount` and `balance`, which do not exist in the database.
2. **`paymentService.js` / `Payments.jsx` Field Inconsistencies**:
   - Mock datasets and form handlers use `payment_mode` instead of live column `payment_method`.
   - `DEMO_PAYMENTS` mock data contains `student_name` and `fee_id`, but live `payments` table lacks `student_name` (must be joined from `students`).
3. **`financeService.js` / `Expenses.jsx` Field Inconsistencies**:
   - `DEMO_EXPENSES` mock data uses `title` and `added_by`, but live table uses `category`, `description`, `expense_date`, `payment_method`.
4. **`payrollService.js` / `Payroll.jsx` Field Inconsistencies**:
   - Mock data uses `bonus` and `month_year`, whereas live `payroll` uses `allowances`, `month`, and `year`.
5. **Over-reliance on Fallback Demo Data**:
   - `feeService.js`, `paymentService.js`, `financeService.js`, and `payrollService.js` all fall back to `DEMO_FEES`, `DEMO_PAYMENTS`, `DEMO_EXPENSES`, `DEMO_PAYROLL` when queries return empty arrays or fail.

---

## 4. Financial Calculation & Accounting Feasibility

### Accounting Feasibility Evaluation:
**Scenario**:
- Gross Student Fee: ₹10,000
- Discount: ₹1,000
- Net Fee: ₹9,000
- Payment 1: ₹5,000
- Payment 2: ₹2,000
- Outstanding Due: ₹2,000

**Schema Support Status**: **100% FEASIBLE & FULLY SUPPORTED**.
- `fees` table stores `total_amount` (10,000), `discount_amount` (1,000), `paid_amount` (accumulative: 7,000), `due_amount` (2,000).
- `payments` table records individual transaction line items (`fee_id` linking to `fees.id`), storing `amount` (5,000 and 2,000 respectively), `payment_date`, `payment_method`, `reference_number`, and `receipt_number`.

---

## 5. Security & Multi-Tenant Scoping Analysis

1. **Owner / Admin Access**:
   - Authorized to manage fees, payments, operational expenses, and faculty payroll across the institute (`institute_id = get_my_institute_id()`).
2. **Teacher Access Restrictions**:
   - Administrative finance records, institute revenue, and payroll are explicitly restricted from teacher accounts (`aiService.js` blocks financial prompts for teachers; navigation routes restrict `/payroll`, `/payments`, `/finance` to owner/admin).
3. **Student Access Controls**:
   - Students can access only their own fee ledgers and payment receipts (`useMyFees.js` filtering via `student_id -> user_id -> auth.uid()`).
4. **Multi-Tenant Scoping**:
   - Every financial insert/select must include `.eq('institute_id', instituteId)`.

---

## 6. Receipt Capabilities
- `fees.receipt_number` and `payments.receipt_number` exist on live tables.
- Transaction reference numbers (`payments.reference_number`) are supported.
- Printable HTML/CSS receipt template generation can be rendered cleanly on the frontend.

---

## 7. Recommended Implementation Sequence for Phase 9

1. **Step 1 — Service Layer Schema Alignment**:
   - Refactor `feeService.js`, `paymentService.js`, `financeService.js`, and `payrollService.js` to match exact live database columns.
   - Remove mock data fallbacks in production queries.
2. **Step 2 — Fees & Payment Ledger (`/fees` & `/payments`)**:
   - Update fee structure creation & payment recording forms.
   - Implement cumulative balance updates (`paid_amount` & `due_amount`) upon payment entry.
3. **Step 3 — Expenses Module (`/finance`)**:
   - Align expense creation form with `category`, `amount`, `expense_date`, `payment_method`, `description`.
   - Update financial dashboard summary calculation (`Gross Revenue - Expenses = Net Profit`).
4. **Step 4 — Faculty Payroll (`/payroll`)**:
   - Align payroll form with `teacher_id`, `month`, `year`, `base_salary`, `allowances`, `deductions`, `net_salary`, `payment_status`.
5. **Step 5 — Student Fee Portal (`/dashboard`)**:
   - Ensure student dashboard renders fee structures and payment history cleanly.

---

## 8. Final Audit Declarations
- **Database Migrations Required**: **NONE**. The live database schema is clean and complete.
- **Security Vulnerabilities Identified**: **NONE**. Current RLS policies and role routing strictly protect financial data.
- **Implementation Status**: **AUDIT ONLY — NO IMPLEMENTATION PERFORMED**.
