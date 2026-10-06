export const ROUTES = {
  HOME: '/',
  STUDENTS: '/students',
  ATTENDANCE: '/attendance',
  FEES: '/fees',
  TEACHERS: '/teachers',
  HOMEWORK: '/homework',
  TESTS: '/tests',
  RESULTS: '/results',
  ANALYTICS: '/analytics',
  SETTINGS: '/settings',
};

// Canonical Payment Methods accepted by PostgreSQL check constraint (payments_payment_method_check)
export const PAYMENT_METHODS = [
  { label: 'Cash', value: 'cash' },
  { label: 'UPI / QR Code', value: 'upi' },
  { label: 'Debit / Credit Card', value: 'card' },
  { label: 'Bank Transfer / IMPS', value: 'bank_transfer' },
  { label: 'Online Payment', value: 'online' },
  { label: 'Cheque', value: 'cheque' },
  { label: 'Other', value: 'other' },
];

// Canonical Payment Statuses accepted by PostgreSQL public.payments
export const PAYMENT_STATUSES = [
  { label: 'Success', value: 'success' },
  { label: 'Pending', value: 'pending' },
  { label: 'Failed', value: 'failed' },
  { label: 'Refunded', value: 'refunded' },
  { label: 'Cancelled', value: 'cancelled' },
];

// Canonical Payroll Statuses accepted by PostgreSQL check constraint (payroll_payment_status_check)
export const PAYROLL_STATUSES = [
  { label: 'Pending', value: 'pending' },
  { label: 'Paid', value: 'paid' },
  { label: 'Cancelled', value: 'cancelled' },
];

export function normalizePaymentMethod(method) {
  if (!method) return 'cash';
  const str = String(method).trim().toLowerCase().replace(/\s+/g, '_');
  const valid = ['cash', 'upi', 'card', 'bank_transfer', 'online', 'cheque', 'other'];
  if (valid.includes(str)) return str;
  if (str === 'banktransfer' || str.includes('bank') || str.includes('transfer') || str.includes('imps')) return 'bank_transfer';
  if (str.includes('qr')) return 'upi';
  if (str.includes('credit') || str.includes('debit')) return 'card';
  return 'cash';
}

export function formatPaymentMethodLabel(method) {
  if (!method) return 'Cash';
  const norm = normalizePaymentMethod(method);
  const found = PAYMENT_METHODS.find((pm) => pm.value === norm);
  return found ? found.label : 'Cash';
}

export function normalizePaymentStatus(status) {
  if (!status) return 'success';
  const str = String(status).trim().toLowerCase();
  const valid = ['success', 'pending', 'failed', 'refunded', 'cancelled'];
  if (valid.includes(str)) return str;
  return 'success';
}

export function normalizePayrollStatus(status) {
  if (!status) return 'pending';
  const str = String(status).trim().toLowerCase();
  const valid = ['pending', 'paid', 'cancelled'];
  if (valid.includes(str)) return str;
  return 'pending';
}

