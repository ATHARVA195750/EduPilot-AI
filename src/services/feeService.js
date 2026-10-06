/**
 * feeService.js — FastAPI backend edition.
 */
import { apiGet, apiPost, apiPut } from '../lib/apiClient';

export async function fetchFees(instituteId, filters = {}) {
  const params = {};
  if (filters.student_id) params.student_id = filters.student_id;
  const data = await apiGet('/finance/fees', params);
  return data || [];
}

export async function fetchFeeById(id) {
  if (!id) return null;
  // FastAPI doesn't have a single-fee endpoint yet — filter client-side
  const fees = await fetchFees();
  return (fees || []).find((f) => f.id === id) || null;
}

export async function createFee(feeData, instituteId) {
  if (!feeData.student_id) throw new Error('Student selection is required.');

  const totalAmount = Number(feeData.total_amount ?? feeData.amount ?? 0);
  const discountAmount = Number(feeData.discount_amount ?? feeData.discount ?? 0);

  if (isNaN(totalAmount) || totalAmount < 0) throw new Error('Total amount must be a valid non-negative number.');
  if (isNaN(discountAmount) || discountAmount < 0) throw new Error('Discount amount must be a valid non-negative number.');
  if (discountAmount > totalAmount) throw new Error('Discount amount cannot exceed total fee amount.');

  return apiPost('/finance/fees', {
    student_id: feeData.student_id,
    total_amount: totalAmount,
    discount_amount: discountAmount,
    due_date: feeData.due_date || null,
  });
}

export async function updateFeeStatus(feeId, updates) {
  if (!feeId) throw new Error('Fee ID is required.');
  const payload = {};
  if (updates.paid_amount !== undefined) payload.paid_amount = Number(updates.paid_amount);
  if (updates.due_amount !== undefined) payload.due_amount = Number(updates.due_amount);
  if (updates.payment_status !== undefined) payload.payment_status = updates.payment_status;
  if (updates.payment_mode !== undefined) payload.payment_mode = updates.payment_mode;
  if (updates.discount_amount !== undefined) payload.discount_amount = Number(updates.discount_amount);
  if (updates.due_date !== undefined) payload.due_date = updates.due_date;
  return apiPut(`/finance/fees/${feeId}`, payload);
}