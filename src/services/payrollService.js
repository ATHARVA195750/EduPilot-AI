import { supabase } from '../lib/supabase.js';
import { normalizePaymentMethod, normalizePayrollStatus } from '../utils/constants.js';

const client = () => {
  if (!supabase) throw new Error('Supabase is not configured.');
  return supabase;
};

const MONTH_NAMES = [
  '', 'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const PAYROLL_FETCH_TIMEOUT_MS = 15000;

const logPayrollDebug = (event, payload) => {
  if (import.meta.env.DEV) console.info(`[PAYROLL DEBUG] ${event}`, payload);
};

function withPayrollFetchTimeout(request) {
  let timeoutId;
  const timeout = new Promise((_, reject) => {
    timeoutId = setTimeout(() => {
      const timeoutError = new Error('Payroll records took too long to load. Please refresh and try again.');
      timeoutError.code = 'PAYROLL_FETCH_TIMEOUT';
      reject(timeoutError);
    }, PAYROLL_FETCH_TIMEOUT_MS);
  });

  return Promise.race([request, timeout]).finally(() => clearTimeout(timeoutId));
}

export async function fetchPayroll(instituteId) {
  if (!instituteId) return [];

  try {
    logPayrollDebug('Supabase query start', { instituteId });
    const payrollRequest = client()
      .from('payroll')
      .select('*, teachers(id, full_name, email, phone)')
      .eq('institute_id', instituteId)
      .order('created_at', { ascending: false });

    const response = await withPayrollFetchTimeout(payrollRequest);
    logPayrollDebug('Supabase query completion', {
      errorCode: response.error?.code || null,
      errorMessage: response.error?.message || null,
      rowCount: response.data?.length || 0,
    });

    if (response.error) {
      const plainRequest = client()
        .from('payroll')
        .select('*')
        .eq('institute_id', instituteId)
        .order('created_at', { ascending: false });
      const plainRes = await withPayrollFetchTimeout(plainRequest);
      logPayrollDebug('Supabase fallback query completion', {
        errorCode: plainRes.error?.code || null,
        errorMessage: plainRes.error?.message || null,
        rowCount: plainRes.data?.length || 0,
      });
      if (plainRes.error) throw plainRes.error;
      return plainRes.data || [];
    }

    return response.data || [];
  } catch (err) {
    console.error('fetchPayroll error:', err.message || err);
    throw err;
  }
}

export async function processPayrollItem(payrollData, instituteId) {
  if (!instituteId) {
    const err = new Error('Institute ID is required.');
    err.code = 'INSTITUTE_REQUIRED';
    throw err;
  }
  if (!payrollData.teacher_id) {
    const err = new Error('Teacher selection is required.');
    err.code = 'TEACHER_REQUIRED';
    throw err;
  }

  const baseSalary = Number(payrollData.base_salary || 0);
  const allowances = Number(payrollData.allowances ?? payrollData.bonus ?? 0);
  const deductions = Number(payrollData.deductions || 0);

  if (isNaN(baseSalary) || baseSalary < 0) {
    const err = new Error('Base salary must be a non-negative number.');
    err.code = 'INVALID_BASE_SALARY';
    throw err;
  }
  if (isNaN(allowances) || allowances < 0) {
    const err = new Error('Allowances must be a non-negative number.');
    err.code = 'INVALID_ALLOWANCES';
    throw err;
  }
  if (isNaN(deductions) || deductions < 0) {
    const err = new Error('Deductions must be a non-negative number.');
    err.code = 'INVALID_DEDUCTIONS';
    throw err;
  }

  const monthMap = {
    January: 1, February: 2, March: 3, April: 4, May: 5, June: 6,
    July: 7, August: 8, September: 9, October: 10, November: 11, December: 12,
  };
  const rawMonth = payrollData.month || payrollData.month_year || (new Date().getMonth() + 1);
  const parsedMonth = typeof rawMonth === 'number' ? rawMonth : (monthMap[rawMonth] || parseInt(rawMonth, 10) || (new Date().getMonth() + 1));
  const parsedYear = parseInt(payrollData.year || new Date().getFullYear(), 10);

  const finalStatus = normalizePayrollStatus(payrollData.payment_status);
  const finalMethod = normalizePaymentMethod(payrollData.payment_method || payrollData.payment_mode || 'bank_transfer');

  // Application-level duplicate check for UNIQUE (teacher_id, month, year)
  const { data: existingRecord } = await client()
    .from('payroll')
    .select('id')
    .eq('institute_id', instituteId)
    .eq('teacher_id', payrollData.teacher_id)
    .eq('month', parsedMonth)
    .eq('year', parsedYear)
    .maybeSingle();

  let teacherName = payrollData.teacher_name;
  if (!teacherName) {
    const { data: tRow } = await client()
      .from('teachers')
      .select('full_name')
      .eq('id', payrollData.teacher_id)
      .maybeSingle();
    teacherName = tRow?.full_name || 'selected teacher';
  }

  const monthLabel = MONTH_NAMES[parsedMonth] || `Month ${parsedMonth}`;

  if (existingRecord) {
    const duplicateError = new Error(`Payroll for ${teacherName} for ${monthLabel} ${parsedYear} already exists.`);
    duplicateError.code = 'PAYROLL_ALREADY_EXISTS';
    duplicateError.details = `Unique constraint (teacher_id, month, year) matched existing payroll record ID ${existingRecord.id}.`;
    throw duplicateError;
  }

  const payload = {
    institute_id: instituteId,
    teacher_id: payrollData.teacher_id,
    month: parsedMonth,
    year: parsedYear,
    base_salary: baseSalary,
    allowances: allowances,
    deductions: deductions,
    // Omitted net_salary because public.payroll.net_salary is a GENERATED ALWAYS STORED column in PostgreSQL
    payment_status: finalStatus,
    payment_method: finalMethod,
    payment_date: payrollData.payment_date || null,
  };

  if (typeof console !== 'undefined' && console.log) {
    console.log('[PROCESS PAYROLL] payload', payload);
  }

  const response = await client().from('payroll').insert([payload]).select().single();
  if (response.error) {
    const error = response.error;
    if (error?.code === '23505') {
      const duplicateError = new Error(`Payroll for ${teacherName} for ${monthLabel} ${parsedYear} already exists.`);
      duplicateError.code = 'PAYROLL_ALREADY_EXISTS';
      duplicateError.details = error?.details;
      throw duplicateError;
    }

    console.error('[PROCESS PAYROLL ERROR]', {
      code: error?.code,
      message: error?.message,
      details: error?.details,
      hint: error?.hint,
    });
    const errObj = new Error(error?.message || `Payroll database error (code ${error?.code})`);
    errObj.code = error?.code;
    errObj.details = error?.details;
    errObj.hint = error?.hint;
    throw errObj;
  }
  return response.data;
}
