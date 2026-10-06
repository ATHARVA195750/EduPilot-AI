import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

type Role = 'owner' | 'admin' | 'teacher' | 'student';

type Profile = {
  id: string;
  institute_id: string | null;
  role: Role;
  status: string | null;
};

// `ReturnType<typeof createClient>` resolves supabase-js's generic DEFAULTS
// (never-flavoured schema params), which mismatch the actual call-site type
// and break `deno check`. Deriving the type from a real factory call keeps the
// inferred `SupabaseClient<any, 'public', 'public', ...>` type instead.
// Runtime behavior is identical to calling createClient(url, key) directly.
function createAdminClient(supabaseUrl: string, serviceRoleKey: string) {
  return createClient(supabaseUrl, serviceRoleKey);
}

type AdminClient = ReturnType<typeof createAdminClient>;

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function isRole(value: unknown): value is Role {
  return ['owner', 'admin', 'teacher', 'student'].includes(String(value));
}

async function loadProfile(adminClient: AdminClient, userId: string) {
  const { data, error } = await adminClient
    .from('profiles')
    .select('id, institute_id, role, status')
    .eq('id', userId)
    .maybeSingle();

  if (error) throw error;
  if (!data || !isRole(data.role)) return null;
  return data as Profile;
}

async function countByInstitute(adminClient: AdminClient, table: string, instituteId: string) {
  const { count, error } = await adminClient
    .from(table)
    .select('id', { count: 'exact', head: true })
    .eq('institute_id', instituteId);

  if (error) throw error;
  return count || 0;
}

async function countByBatches(adminClient: AdminClient, table: string, instituteId: string, batchIds: string[]) {
  if (batchIds.length === 0) return 0;

  const { count, error } = await adminClient
    .from(table)
    .select('id', { count: 'exact', head: true })
    .eq('institute_id', instituteId)
    .in('batch_id', batchIds);

  if (error) throw error;
  return count || 0;
}

/**
 * Live public.attendance has NO institute_id column, so institute-wide
 * attendance cannot be counted with countByInstitute().
 * It must be derived through a relationship that does exist:
 * attendance.student_id -> students.institute_id.
 *
 * 1. Exact single-query count using an inner join on the students relationship.
 * 2. Fallback (only if PostgREST rejects the join query) scoping by the
 *    institute's own batch ids.
 * Neither path reports a fabricated count: if both fail we throw.
 */
async function countInstituteAttendance(adminClient: AdminClient, instituteId: string) {
  const { count, error } = await adminClient
    .from('attendance')
    .select('id, students!inner(institute_id)', { count: 'exact', head: true })
    .eq('students.institute_id', instituteId);

  if (!error) return count || 0;

  console.warn('Institute attendance count via student relationship failed, falling back to batch scope:', error.message);

  const { data: batches, error: batchError } = await adminClient
    .from('batches')
    .select('id')
    .eq('institute_id', instituteId);

  if (batchError) throw batchError;

  const batchIds = ((batches || []) as { id: string }[]).map((batch) => batch.id).filter(Boolean);
  if (batchIds.length === 0) return 0;

  const { count: batchCount, error: batchCountError } = await adminClient
    .from('attendance')
    .select('id', { count: 'exact', head: true })
    .in('batch_id', batchIds);

  if (batchCountError) throw batchCountError;
  return batchCount || 0;
}

// ---------------------------------------------------------------------------
// Owner Financial AI Context
// Server-side deterministic helpers for verified financial aggregation.
// Column names come from the empirically verified live schemas
// (docs/PHASE_9_FINANCE_AUDIT.md), not assumptions:
//   fees:     student_id, total_amount, paid_amount, due_amount,
//             discount_amount, due_date, payment_status
//   payments: amount, payment_date, payment_method, status
//   expenses: amount, category, expense_date
//   payroll:  net_salary, base_salary, allowances, deductions,
//             month (1-12), year, payment_date
// ---------------------------------------------------------------------------

const FINANCIAL_TERM_PATTERNS = [
  /\bfees?\b/, /\bpayments?\b/, /\bpaid\b/, /\bpending\b/, /\boverdue\b/, /\bdue\b/,
  /\bcollections?\b/, /\bcollect(ed|ing)?\b/, /\brevenue\b/, /\bincome\b/,
  /\bexpenses?\b/, /\bpayroll\b/, /\bsalar(?:y|ies)\b/, /\bprofit\b/, /\bloss\b/,
  /\bbalance\b/, /\bmoney\b/, /\bfinanc(?:e|es|ial)\b/, /\bearnings?\b/,
  /\bdefaulters?\b/, /\bbudget\b/, /\bcosts?\b/, /\bpricing\b/, /\baccounts?\b/,
  /₹/, /\binr\b/, /\brs\b/,
];

function isFinancialQuery(lowerPrompt: string): boolean {
  return FINANCIAL_TERM_PATTERNS.some((pattern) => pattern.test(lowerPrompt));
}

type FinancialPeriod = {
  label: string;
  start: string | null; // inclusive YYYY-MM-DD (null = no lower bound)
  end: string | null;   // exclusive YYYY-MM-DD (null = no upper bound)
};

type OwnerFinancialContext = {
  status: 'ok' | 'no_data' | 'error';
  currency: 'INR';
  period: { label: string; from: string | null; toExclusive: string | null };
  note: string;
  fees: Record<string, unknown> | null;
  collections: Record<string, unknown> | null;
  expenses: Record<string, unknown> | null;
  payroll: Record<string, unknown> | null;
  netCashFlowInPeriod: number | null;
  topPendingStudents: Record<string, unknown>[];
};

// Fixed calendar so period boundaries never depend on the model or server locale.
const TIME_ZONE = 'Asia/Kolkata';
const MONTH_NAMES = [
  'january', 'february', 'march', 'april', 'may', 'june',
  'july', 'august', 'september', 'october', 'november', 'december',
];

function toNumber(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function roundRupees(value: number): number {
  return Math.round(value * 100) / 100;
}

function todayInKolkata(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

function addDaysISO(isoDate: string, days: number): string {
  const [year, month, day] = isoDate.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10);
}

function startOfWeekIso(isoDate: string): string {
  const [year, month, day] = isoDate.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  const mondayOffset = (date.getUTCDay() + 6) % 7; // Monday = 0
  date.setUTCDate(date.getUTCDate() - mondayOffset);
  return date.toISOString().slice(0, 10);
}

function resolveFinancialPeriod(lowerPrompt: string, todayIso: string): FinancialPeriod {
  if (/\byesterday\b/.test(lowerPrompt)) {
    const day = addDaysISO(todayIso, -1);
    return { label: 'yesterday', start: day, end: addDaysISO(day, 1) };
  }
  if (/\btoday\b/.test(lowerPrompt)) {
    return { label: 'today', start: todayIso, end: addDaysISO(todayIso, 1) };
  }
  // "last N days" (e.g. "last 30 days"): same day-granular semantics as the
  // client's financePeriodForRange() — Asia/Kolkata calendar days, half-open
  // [today-(N-1), tomorrow).
  const lastDaysMatch = /\blast\s+(\d{1,4})\s+days?\b/.exec(lowerPrompt);
  if (lastDaysMatch) {
    const days = Number(lastDaysMatch[1]);
    if (Number.isFinite(days) && days > 0) {
      return { label: `last ${days} days`, start: addDaysISO(todayIso, -(days - 1)), end: addDaysISO(todayIso, 1) };
    }
  }
  if (lowerPrompt.includes('last month') || lowerPrompt.includes('previous month')) {
    const thisMonthStart = `${todayIso.slice(0, 7)}-01`;
    const lastMonthStart = `${addDaysISO(thisMonthStart, -1).slice(0, 7)}-01`;
    return { label: 'last month', start: lastMonthStart, end: thisMonthStart };
  }
  if (lowerPrompt.includes('this week') || lowerPrompt.includes('current week')) {
    const weekStart = startOfWeekIso(todayIso);
    return { label: 'this week (since Monday)', start: weekStart, end: addDaysISO(weekStart, 7) };
  }
  if (lowerPrompt.includes('last week') || lowerPrompt.includes('previous week')) {
    const thisWeekStart = startOfWeekIso(todayIso);
    return { label: 'last week', start: addDaysISO(thisWeekStart, -7), end: thisWeekStart };
  }
  if (lowerPrompt.includes('last year') || lowerPrompt.includes('previous year')) {
    const year = Number(todayIso.slice(0, 4)) - 1;
    return { label: `year ${year}`, start: `${year}-01-01`, end: `${year + 1}-01-01` };
  }
  if (lowerPrompt.includes('this month')) {
    const monthStart = `${todayIso.slice(0, 7)}-01`;
    const [year, month] = monthStart.split('-').map(Number);
    const nextMonthStart = new Date(Date.UTC(year, month, 1)).toISOString().slice(0, 10);
    return { label: 'this month', start: monthStart, end: nextMonthStart };
  }
  if (lowerPrompt.includes('this year')) {
    const year = todayIso.slice(0, 4);
    return { label: 'this year', start: `${year}-01-01`, end: `${Number(year) + 1}-01-01` };
  }
  // Named month (e.g. "in June") -> most recent past occurrence, deterministically.
  const currentYear = Number(todayIso.slice(0, 4));
  const currentMonth = Number(todayIso.slice(5, 7));
  for (let index = 0; index < MONTH_NAMES.length; index += 1) {
    const name = MONTH_NAMES[index];
    if (new RegExp(`\\b${name}\\b`).test(lowerPrompt)) {
      const month = index + 1;
      const year = month > currentMonth ? currentYear - 1 : currentYear;
      const nextYear = month === 12 ? year + 1 : year;
      const nextMonth = month === 12 ? 1 : month + 1;
      return {
        label: `${name} ${year}`,
        start: `${year}-${String(month).padStart(2, '0')}-01`,
        end: `${nextYear}-${String(nextMonth).padStart(2, '0')}-01`,
      };
    }
  }
  return { label: 'all time', start: null, end: null };
}

function monthsCoveredBy(period: FinancialPeriod): { year: number; month: number }[] {
  if (!period.start || !period.end) return [];
  const months: { year: number; month: number }[] = [];
  let cursor = period.start;
  while (cursor < period.end && months.length < 36) {
    const year = Number(cursor.slice(0, 4));
    const month = Number(cursor.slice(5, 7));
    months.push({ year, month });
    const nextYear = month === 12 ? year + 1 : year;
    const nextMonth = month === 12 ? 1 : month + 1;
    cursor = `${nextYear}-${String(nextMonth).padStart(2, '0')}-01`;
  }
  return months;
}

function payrollMonthMatches(rowMonth: unknown, rowYear: unknown, expected: { year: number; month: number }): boolean {
  if (toNumber(rowYear) !== expected.year) return false;
  const monthValue = toNumber(rowMonth);
  if (monthValue >= 1 && monthValue <= 12) return monthValue === expected.month;
  const nameIndex = MONTH_NAMES.indexOf(String(rowMonth ?? '').trim().toLowerCase());
  return nameIndex >= 0 && nameIndex + 1 === expected.month;
}

async function loadOwnerFinancialContext(
  adminClient: AdminClient,
  instituteId: string,
  lowerPrompt: string,
): Promise<OwnerFinancialContext> {
  const todayIso = todayInKolkata();
  const period = resolveFinancialPeriod(lowerPrompt, todayIso);
  const periodInfo = { label: period.label, from: period.start, toExclusive: period.end };

  const [feesRes, paymentsRes, expensesRes, payrollRes] = await Promise.all([
    adminClient
      .from('fees')
      .select('student_id, total_amount, paid_amount, due_amount, discount_amount, due_date, payment_status')
      .eq('institute_id', instituteId),
    adminClient
      .from('payments')
      .select('amount, payment_date, payment_method, status')
      .eq('institute_id', instituteId),
    adminClient
      .from('expenses')
      .select('amount, category, expense_date')
      .eq('institute_id', instituteId),
    adminClient
      .from('payroll')
      .select('net_salary, base_salary, allowances, deductions, month, year, payment_date')
      .eq('institute_id', instituteId),
  ]);

  const queryError = [feesRes.error, paymentsRes.error, expensesRes.error, payrollRes.error].find(Boolean);
  if (queryError) throw queryError;

  const feeRows = (feesRes.data || []) as Record<string, unknown>[];
  const paymentRows = (paymentsRes.data || []) as Record<string, unknown>[];
  const expenseRows = (expensesRes.data || []) as Record<string, unknown>[];
  const payrollRows = (payrollRes.data || []) as Record<string, unknown>[];

  if (feeRows.length === 0 && paymentRows.length === 0 && expenseRows.length === 0 && payrollRows.length === 0) {
    return {
      status: 'no_data',
      currency: 'INR',
      period: periodInfo,
      note: 'No fee, payment, expense, or payroll records exist for this institute. Clearly state that no financial records are available; do not estimate or invent any figures.',
      fees: null,
      collections: null,
      expenses: null,
      payroll: null,
      netCashFlowInPeriod: null,
      topPendingStudents: [],
    };
  }

  // --- Fee ledger (lifetime snapshot; dues are not date-filtered) ---
  let totalGross = 0;
  let totalDiscount = 0;
  let totalExpectedNet = 0;
  let totalPaidToDate = 0;
  let totalOutstanding = 0;
  let overdueCount = 0;
  let overdueAmount = 0;
  let pendingRecords = 0;
  let dueInPeriodCount = 0;
  let dueInPeriodAmount = 0;
  const statusCounts = { paid: 0, partial: 0, pending: 0, other: 0 };

  for (const row of feeRows) {
    const gross = toNumber(row.total_amount);
    const discount = toNumber(row.discount_amount);
    const paid = toNumber(row.paid_amount);
    const due = toNumber(row.due_amount);
    totalGross += gross;
    totalDiscount += discount;
    totalExpectedNet += gross - discount;
    totalPaidToDate += paid;
    totalOutstanding += due;

    const dueDate = row.due_date ? String(row.due_date).slice(0, 10) : '';
    if (due > 0) {
      pendingRecords += 1;
      if (dueDate && dueDate < todayIso) {
        overdueCount += 1;
        overdueAmount += due;
      }
      if (period.start && dueDate && dueDate >= (period.start as string) && dueDate < (period.end as string)) {
        dueInPeriodCount += 1;
        dueInPeriodAmount += due;
      }
    }

    const status = String(row.payment_status || '').toLowerCase();
    if (status === 'paid') statusCounts.paid += 1;
    else if (status === 'partial') statusCounts.partial += 1;
    else if (status === 'pending') statusCounts.pending += 1;
    else statusCounts.other += 1;
  }

  // --- Collections (payments), filtered by the deterministic period ---
  let collectedAllTime = 0;
  let collectedInPeriod = 0;
  let paymentsInPeriod = 0;
  const collectedByMethodInPeriod: Record<string, number> = {};
  const collectedByStatusInPeriod: Record<string, number> = {};

  for (const row of paymentRows) {
    // F-22 canonical: collections count ONLY payments with status 'success'.
    // Pending / failed / refunded rows are never cash in hand, so they are
    // skipped before every collected* accumulator below (collectedAllTime,
    // collectedInPeriod, paymentsInPeriod, collectedByMethodInPeriod,
    // collectedByStatusInPeriod).
    const status = String(row.status ?? 'success').trim().toLowerCase();
    if (status !== 'success') continue;
    const amount = toNumber(row.amount);
    collectedAllTime += amount;
    const date = row.payment_date ? String(row.payment_date).slice(0, 10) : '';
    const inPeriod = !period.start ||
      (Boolean(date) && date >= (period.start as string) && date < (period.end as string));
    if (!inPeriod) continue;
    collectedInPeriod += amount;
    paymentsInPeriod += 1;
    const method = String(row.payment_method || 'Unknown');
    collectedByMethodInPeriod[method] = roundRupees((collectedByMethodInPeriod[method] || 0) + amount);
    collectedByStatusInPeriod[status] = roundRupees((collectedByStatusInPeriod[status] || 0) + amount);
  }

  // --- Operational expenses, filtered by the deterministic period ---
  let expensesAllTime = 0;
  let expensesInPeriod = 0;
  const expensesByCategoryInPeriod: Record<string, number> = {};

  for (const row of expenseRows) {
    const amount = toNumber(row.amount);
    expensesAllTime += amount;
    const date = row.expense_date ? String(row.expense_date).slice(0, 10) : '';
    const inPeriod = !period.start ||
      (Boolean(date) && date >= (period.start as string) && date < (period.end as string));
    if (!inPeriod) continue;
    expensesInPeriod += amount;
    const category = String(row.category || 'General');
    expensesByCategoryInPeriod[category] = roundRupees((expensesByCategoryInPeriod[category] || 0) + amount);
  }

  // --- Payroll. Day/week periods match only payment_date; month-granular
  //     periods also match payroll's (month, year) pair so rows with a null
  //     payment_date are still counted deterministically. ---
  const dayGranularPeriod = ['today', 'yesterday'].includes(period.label) || period.label.includes('week');
  const coveredMonths = period.start && !dayGranularPeriod ? monthsCoveredBy(period) : [];
  let payrollAllTime = 0;
  let payrollInPeriod = 0;

  for (const row of payrollRows) {
    const amount = toNumber(row.net_salary) ||
      (toNumber(row.base_salary) + toNumber(row.allowances) - toNumber(row.deductions));
    payrollAllTime += amount;
    if (!period.start) {
      payrollInPeriod += amount;
      continue;
    }
    const payDate = row.payment_date ? String(row.payment_date).slice(0, 10) : '';
    const dateMatch = Boolean(payDate) &&
      payDate >= (period.start as string) && payDate < (period.end as string);
    const monthMatch = coveredMonths.some((expected) => payrollMonthMatches(row.month, row.year, expected));
    if (dateMatch || monthMatch) payrollInPeriod += amount;
  }

  // --- Top pending students (max 5; names resolved via an institute-scoped
  //     students query so only minimal fields ever reach the model). ---
  const topDueRows = feeRows
    .filter((row) => toNumber(row.due_amount) > 0)
    .sort((a, b) => toNumber(b.due_amount) - toNumber(a.due_amount))
    .slice(0, 5);

  let topPendingStudents: Record<string, unknown>[] = [];
  if (topDueRows.length > 0) {
    const studentIds = [...new Set(topDueRows.map((row) => String(row.student_id)))];
    const { data: studentRows, error: studentError } = await adminClient
      .from('students')
      .select('id, full_name, student_id_code')
      .eq('institute_id', instituteId)
      .in('id', studentIds);
    if (studentError) throw studentError;

    const studentById = new Map<string, { full_name?: string; student_id_code?: string }>(
      ((studentRows || []) as { id: string; full_name?: string; student_id_code?: string }[])
        .map((row): [string, { full_name?: string; student_id_code?: string }] => [row.id, row]),
    );

    topPendingStudents = topDueRows.map((row) => {
      const student = studentById.get(String(row.student_id));
      return {
        studentName: student?.full_name || null,
        studentIdCode: student?.student_id_code || null,
        pendingAmount: roundRupees(toNumber(row.due_amount)),
        dueDate: row.due_date ? String(row.due_date).slice(0, 10) : null,
        paymentStatus: row.payment_status ? String(row.payment_status) : null,
      };
    });
  }

  return {
    status: 'ok',
    currency: 'INR',
    period: periodInfo,
    note: `All figures were computed server-side from institute-scoped database records. The period "${period.label}" was resolved on the server using the Asia/Kolkata calendar${period.start ? ` and covers ${period.start} up to but excluding ${period.end}` : ' and covers all available records'}. Explain these values as given; never recalculate them, never do date math, and never infer numbers that are not present.`,
    fees: {
      feeRecords: feeRows.length,
      totalGross: roundRupees(totalGross),
      totalDiscount: roundRupees(totalDiscount),
      totalExpectedNet: roundRupees(totalExpectedNet),
      totalPaidToDate: roundRupees(totalPaidToDate),
      totalOutstanding: roundRupees(totalOutstanding),
      pendingFeeRecords: pendingRecords,
      statusCounts,
      overdue: { count: overdueCount, amount: roundRupees(overdueAmount), asOf: todayIso },
      dueInPeriod: period.start ? { count: dueInPeriodCount, amount: roundRupees(dueInPeriodAmount) } : null,
    },
    collections: {
      collectedInPeriod: roundRupees(collectedInPeriod),
      paymentCountInPeriod: paymentsInPeriod,
      collectedByMethodInPeriod,
      collectedByStatusInPeriod,
      collectedAllTime: roundRupees(collectedAllTime),
      paymentCountAllTime: paymentRows.length,
    },
    expenses: {
      expensesInPeriod: roundRupees(expensesInPeriod),
      expensesByCategoryInPeriod,
      expensesAllTime: roundRupees(expensesAllTime),
      expenseCountAllTime: expenseRows.length,
    },
    payroll: {
      payrollInPeriod: roundRupees(payrollInPeriod),
      payrollAllTime: roundRupees(payrollAllTime),
      payrollRecordCount: payrollRows.length,
    },
    netCashFlowInPeriod: roundRupees(collectedInPeriod - expensesInPeriod - payrollInPeriod),
    topPendingStudents,
  };
}

async function loadAuthorizedContext(adminClient: AdminClient, profile: Profile) {
  if (!profile.institute_id) {
    return { role: profile.role, scope: 'none', metrics: {} };
  }

  if (profile.role === 'owner' || profile.role === 'admin') {
    const [students, teachers, attendance, fees, homework, tests, announcements] = await Promise.all([
      countByInstitute(adminClient, 'students', profile.institute_id),
      countByInstitute(adminClient, 'teachers', profile.institute_id),
      countInstituteAttendance(adminClient, profile.institute_id),
      countByInstitute(adminClient, 'fees', profile.institute_id),
      countByInstitute(adminClient, 'homework', profile.institute_id),
      countByInstitute(adminClient, 'tests', profile.institute_id),
      countByInstitute(adminClient, 'announcements', profile.institute_id),
    ]);

    return {
      role: profile.role,
      scope: 'institute',
      metrics: { students, teachers, attendanceRecords: attendance, fees, homework, tests, announcements },
    };
  }

  if (profile.role === 'student') {
    const { data: student, error: studentError } = await adminClient
      .from('students')
      .select('id, batch_id, standard')
      .eq('user_id', profile.id)
      .eq('institute_id', profile.institute_id)
      .maybeSingle();

    if (studentError) throw studentError;
    if (!student) return { role: profile.role, scope: 'student', metrics: {} };

    const [attendance, fees, results] = await Promise.all([
      adminClient.from('attendance').select('id', { count: 'exact', head: true }).eq('student_id', student.id),
      adminClient.from('fees').select('id', { count: 'exact', head: true }).eq('student_id', student.id).eq('institute_id', profile.institute_id),
      adminClient.from('results').select('id', { count: 'exact', head: true }).eq('student_id', student.id),
    ]);

    const queryError = [attendance.error, fees.error, results.error].find(Boolean);
    if (queryError) throw queryError;

    return {
      role: profile.role,
      scope: 'student',
      metrics: {
        attendanceRecords: attendance.count || 0,
        feeRecords: fees.count || 0,
        resultRecords: results.count || 0,
        batchId: student.batch_id,
        standard: student.standard,
      },
    };
  }

  const { data: teacher, error: teacherError } = await adminClient
    .from('teachers')
    .select('id')
    .eq('user_id', profile.id)
    .eq('institute_id', profile.institute_id)
    .maybeSingle();

  if (teacherError) throw teacherError;
  if (!teacher) return { role: profile.role, scope: 'teacher', metrics: {} };

  const { data: assignments, error: assignmentsError } = await adminClient
    .from('teacher_assignments')
    .select('batch_id, subject_id')
    .eq('teacher_id', teacher.id)
    .eq('institute_id', profile.institute_id)
    // The live CHECK constraint only allows ('active','inactive'), so matching
    // 'Active' returned zero rows and every teacher answer was built from an
    // empty scope.
    .in('status', ['active', 'Active']);

  if (assignmentsError) throw assignmentsError;

  const batchIds = [...new Set((assignments || []).map((assignment) => assignment.batch_id).filter(Boolean))];
  const subjectIds = [...new Set((assignments || []).map((assignment) => assignment.subject_id).filter(Boolean))];

  const [homework, tests, sessions, students] = await Promise.all([
    countByBatches(adminClient, 'homework', profile.institute_id, batchIds),
    countByBatches(adminClient, 'tests', profile.institute_id, batchIds),
    adminClient
      .from('class_sessions')
      .select('id', { count: 'exact', head: true })
      .eq('institute_id', profile.institute_id)
      .eq('teacher_id', teacher.id)
      .then(({ count, error }) => {
        if (error) throw error;
        return count || 0;
      }),
    // Students inside the teacher's assigned batches. This is the metric a teacher
    // actually asks for ("how many students do I have?"); without it the model had
    // no basis for the answer and had to say it did not know.
    countByBatches(adminClient, 'students', profile.institute_id, batchIds),
  ]);

  return {
    role: profile.role,
    scope: 'teacher-assigned',
    metrics: {
      assignedBatches: batchIds.length,
      assignedSubjects: subjectIds.length,
      studentsInAssignedBatches: students,
      homework,
      tests,
      classSessions: sessions,
    },
  };
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return jsonResponse({ error: 'Method not allowed.' }, 405);

  const authorization = request.headers.get('Authorization');
  if (!authorization?.startsWith('Bearer ')) return jsonResponse({ error: 'Authentication required.' }, 401);

  const accessToken = authorization.slice('Bearer '.length).trim();
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const groqApiKey = Deno.env.get('GROQ_API_KEY');

  if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey || !groqApiKey) {
    return jsonResponse({ error: 'Server configuration is incomplete.' }, 500);
  }

  const authClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  });
  const adminClient = createAdminClient(supabaseUrl, serviceRoleKey);

  const { data: authData, error: authError } = await authClient.auth.getUser(accessToken);
  if (authError || !authData.user) return jsonResponse({ error: 'Invalid or expired session.' }, 401);

  let body: { prompt?: string };
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: 'Invalid JSON request.' }, 400);
  }

  const prompt = String(body.prompt || '').trim();
  if (!prompt || prompt.length > 4000) return jsonResponse({ error: 'Prompt must be between 1 and 4000 characters.' }, 400);

  try {
    const profile = await loadProfile(adminClient, authData.user.id);
    if (!profile) return jsonResponse({ error: 'No valid institute profile was found.' }, 403);
    // A deactivated account must lose AI access immediately. The Edge Function
    // queries with the service role and therefore bypasses the RLS policies that
    // gate the data plane, so the status has to be re-checked here; previously a
    // deactivated user kept answering prompts until their JWT expired.
    if (profile.status && String(profile.status).trim().toLowerCase() !== 'active') {
      return jsonResponse({ error: 'Your account is inactive. Please contact your institute administrator.' }, 403);
    }

    const lowerPrompt = prompt.toLowerCase();
    if (profile.role === 'student' && ['fee', 'revenue', 'income', 'salary', 'expense', 'payroll', 'institute'].some((term) => lowerPrompt.includes(term))) {
      return jsonResponse({ choices: [{ message: { content: 'Access restricted: this assistant only provides personal study, homework, and course support.' } }] });
    }
    if (profile.role === 'teacher' && ['revenue', 'net income', 'salary', 'payroll', 'expense'].some((term) => lowerPrompt.includes(term))) {
      return jsonResponse({ choices: [{ message: { content: 'Access restricted: financial and payroll information is available only to Institute Owners and Admins.' } }] });
    }

    // Owner/Admin financial questions get a verified, server-computed context.
    // Institute scope is derived from the JWT profile only -- never from the client.
    let ownerFinancialContext: OwnerFinancialContext | null = null;
    if ((profile.role === 'owner' || profile.role === 'admin') && profile.institute_id && isFinancialQuery(lowerPrompt)) {
      try {
        ownerFinancialContext = await loadOwnerFinancialContext(adminClient, profile.institute_id, lowerPrompt);
      } catch (error) {
        console.error('Owner financial context load failed:', error);
        ownerFinancialContext = {
          status: 'error',
          currency: 'INR',
          period: { label: 'unavailable', from: null, toExclusive: null },
          note: 'Verified financial data could not be loaded right now. Tell the user that verified financial data is temporarily unavailable and to retry; do not guess or fabricate any figures.',
          fees: null,
          collections: null,
          expenses: null,
          payroll: null,
          netCashFlowInPeriod: null,
          topPendingStudents: [],
        };
      }
    }

    const context = await loadAuthorizedContext(adminClient, profile);

    const systemInstruction = `You are EduPilot ERP AI assistance. Authenticated role: ${context.role}. Authorized scope: ${context.scope}. Use only the supplied authorized aggregate context and do not infer or reveal records outside it.${
      ownerFinancialContext
        ? ' A Verified financial context computed server-side is included below. Treat every figure in it as exact and authoritative: explain the numbers as given, never compute, estimate, or invent financial values, and never do date math (periods are already resolved on the server). If its status is "no_data", clearly state that no financial records exist for this institute. If its status is "error", clearly state that verified financial data is unavailable right now and do not guess.'
        : ''
    }`;

    const contextBlocks = [`Authorized aggregate context:\n${JSON.stringify(context.metrics)}`];
    if (ownerFinancialContext) {
      contextBlocks.push(`Verified financial context (server-computed; period resolved server-side):\n${JSON.stringify(ownerFinancialContext)}`);
    }

    const providerResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${groqApiKey}` },
      body: JSON.stringify({
        model: 'openai/gpt-oss-20b',
        messages: [
          { role: 'system', content: systemInstruction },
          { role: 'user', content: `${prompt}\n\n${contextBlocks.join('\n\n')}` },
        ],
        temperature: 0.3,
        max_tokens: 700,
      }),
    });

    if (!providerResponse.ok) {
      console.error('AI provider request failed:', providerResponse.status);
      return jsonResponse({ error: 'AI provider request failed.' }, 502);
    }

    const providerPayload = await providerResponse.json();
    return jsonResponse({ choices: [{ message: { content: providerPayload?.choices?.[0]?.message?.content || '' } }] });
  } catch (error) {
    console.error('AI function error:', error);
    return jsonResponse({ error: 'Unable to generate authorized AI insight.' }, 500);
  }
});