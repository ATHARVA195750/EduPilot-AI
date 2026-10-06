/**
 * invoiceService.js — FastAPI backend edition.
 */
import { apiGet } from '../lib/apiClient';

export async function fetchInvoices(instituteId) {
  const data = await apiGet('/finance/invoices');
  return data || [];
}

export async function fetchInvoiceByPaymentId(paymentId) {
  if (!paymentId) return null;
  const invoices = await fetchInvoices();
  return invoices.find((inv) => inv.payment_id === paymentId) || null;
}

export async function fetchInvoicesByStudentId(studentId) {
  if (!studentId) return [];
  const invoices = await fetchInvoices();
  return invoices.filter((inv) => inv.student_id === studentId);
}

export function indexInvoicesByPayment(invoices) {
  const map = new Map();
  (invoices || []).forEach((inv) => {
    if (inv?.payment_id) map.set(inv.payment_id, inv);
  });
  return map;
}
