/**
 * paymentService.js — FastAPI backend edition.
 */
import { apiGet, apiPost } from '../lib/apiClient';

export async function fetchPayments(instituteId) {
  const data = await apiGet('/finance/payments');
  return data || [];
}

export async function fetchPaymentsByFeeId(feeId, instituteId) {
  if (!feeId) return [];
  const payments = await fetchPayments(instituteId);
  return payments.filter((p) => p.fee_id === feeId);
}

export async function recordPayment(paymentData, instituteId) {
  const payload = {
    fee_id: paymentData.fee_id || null,
    student_id: paymentData.student_id,
    amount: Number(paymentData.amount),
    payment_method: (paymentData.payment_method || paymentData.payment_mode || 'cash').toLowerCase().replace(' ', '_'),
    reference_number: paymentData.reference_number || paymentData.transaction_id || null,
  };
  return apiPost('/finance/payments', payload);
}
