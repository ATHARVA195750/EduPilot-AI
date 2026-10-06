// Canonical owner-facing financial definition (pilot-blocker closure F-22).
//
// NET CASH POSITION = ACTUAL COLLECTIONS − EXPENSES − PAYROLL
//
// - "Collections" = SUM(payments.amount) for rows whose status is a
//   successful collection ('success'). Pending/failed/refunded/cancelled
//   rows are reported separately and never counted as cash in hand.
// - "Expenses" = SUM(expenses.amount).
// - "Payroll" = SUM(payroll.net_salary), falling back to
//   base_salary + allowances − deductions when net_salary is absent.
// - Fee assignments (fees.total_amount), discounts, pending dues and ledger
//   balances are SEPARATE metrics and must never be substituted for
//   "net cash position".
//
// Every consumer (Dashboard, Analytics, Reports, Finance summary, Owner AI
// context) must derive these three inputs through the helpers below so the
// date range, status filter, and formula cannot drift between modules.

export const SUCCESS_PAYMENT_STATUSES = ['success'];

const toNumber = (value) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

const statusOf = (row) => String(row?.status ?? 'success').trim().toLowerCase();

export function isCollectedPayment(row) {
  return SUCCESS_PAYMENT_STATUSES.includes(statusOf(row));
}

export function sumCollections(payments) {
  let total = 0;
  for (const p of payments || []) {
    if (isCollectedPayment(p)) total += toNumber(p.amount);
  }
  return total;
}

export function sumNonCollectedPayments(payments) {
  return (payments || []).reduce((sum, p) => (!isCollectedPayment(p) ? sum + toNumber(p.amount) : 0), 0);
}

export function sumExpenses(expenses) {
  return (expenses || []).reduce((sum, e) => sum + toNumber(e.amount), 0);
}

export function payrollRowAmount(row) {
  if (row == null) return 0;
  const net = Number(row.net_salary);
  if (Number.isFinite(net)) return net;
  return toNumber(row.base_salary) + toNumber(row.allowances) - toNumber(row.deductions);
}

export function sumPayroll(payroll) {
  return (payroll || []).reduce((sum, p) => sum + payrollRowAmount(p), 0);
}

// Canonical net cash position. Inputs are already-fetched row arrays so the
// same function serves Dashboard, Analytics, Reports and the Finance page.
export function netCashPosition({ payments = [], expenses = [], payroll = [] } = {}) {
  const collections = sumCollections(payments);
  const expenseTotal = sumExpenses(expenses);
  const payrollTotal = sumPayroll(payroll);
  return {
    collections,
    expenses: expenseTotal,
    payroll: payrollTotal,
    netCash: collections - expenseTotal - payrollTotal,
    nonCollectedPayments: sumNonCollectedPayments(payments),
  };
}

// --- Shared finance period boundaries (F-22) -------------------------------
// Canonical rule shared by Analytics (client) and the ai-insights edge
// function: CALENDAR DAYS in Asia/Kolkata, half-open [start, end) — `start`
// is inclusive, `end` is the exclusive next-day boundary. A null period
// ('all') is unbounded. Rows with a NULL/absent finance date are EXCLUDED
// from any named period because they cannot be placed inside a window.
// These helpers intentionally mirror loadOwnerFinancialContext()'s date maths
// so Analytics and the Owner AI financial context cannot drift apart.

export const FINANCE_TIME_ZONE = 'Asia/Kolkata';

export function kolkataTodayISO(now = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: FINANCE_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}

const addDaysISO = (isoDate, days) => {
  const [year, month, day] = isoDate.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10);
};

export function financePeriodForRange(range) {
  if (range == null || range === '' || range === 'all') return null;
  const days = Number(range);
  if (!Number.isFinite(days) || days <= 0) return null;
  const today = kolkataTodayISO();
  return {
    start: addDaysISO(today, -(days - 1)), // inclusive first Kolkata calendar day
    end: addDaysISO(today, 1),             // exclusive upper bound (tomorrow)
  };
}

export function dateInFinancePeriod(value, period) {
  if (!period) return true; // 'all' → unbounded
  const date = value ? String(value).slice(0, 10) : '';
  if (!date) return false; // NULL finance dates are excluded from named periods
  return date >= period.start && date < period.end;
}
