/**
 * payrollService.js — FastAPI backend edition.
 */
import { apiGet, apiPost } from '../lib/apiClient';

export async function fetchPayroll(instituteId) {
  const data = await apiGet('/finance/payroll');
  return data || [];
}

// The Disbursement modal stores the month as a display name ("October").
// FastAPI's PayrollCreate expects month: int (1-12). Normalise names, numeric
// strings and numbers here — sending NaN/unknown produced a 422 whose
// array-shaped `detail` was rendered in the UI as "[object Object]".
const MONTH_NAME_TO_NUMBER = {
  january: 1, february: 2, march: 3, april: 4, may: 5, june: 6,
  july: 7, august: 8, september: 9, october: 10, november: 11, december: 12,
};

function toMonthNumber(value) {
  const fallback = new Date().getMonth() + 1;
  if (typeof value === 'string') {
    const trimmed = value.trim().toLowerCase();
    if (MONTH_NAME_TO_NUMBER[trimmed]) return MONTH_NAME_TO_NUMBER[trimmed];
    const asNumber = Number(trimmed);
    if (Number.isInteger(asNumber) && asNumber >= 1 && asNumber <= 12) return asNumber;
    return fallback;
  }
  const asNumber = Number(value);
  if (Number.isInteger(asNumber) && asNumber >= 1 && asNumber <= 12) return asNumber;
  return fallback;
}

export async function processPayrollItem(payrollData, instituteId) {
  if (!payrollData.teacher_id) {
    throw new Error('Teacher selection is required.');
  }

  const payload = {
    teacher_id: payrollData.teacher_id,
    month: toMonthNumber(payrollData.month),
    year: Number(payrollData.year || new Date().getFullYear()),
    base_salary: Number(payrollData.base_salary || 0),
    allowances: Number(payrollData.allowances || payrollData.bonus || 0),
    deductions: Number(payrollData.deductions || 0),
    payment_status: (payrollData.payment_status || 'paid').toLowerCase(),
    payment_method: (payrollData.payment_method || 'bank_transfer').toLowerCase().replace(' ', '_'),
    payment_date: payrollData.payment_date || new Date().toISOString().slice(0, 10),
  };

  return apiPost('/finance/payroll', payload);
}
