import { supabase } from '../lib/supabase.js';
import { normalizePaymentMethod, normalizePaymentStatus } from '../utils/constants.js';

const client = () => {
  if (!supabase) throw new Error('Supabase is not configured.');
  return supabase;
};

// Live public.payments table schema:
// id (uuid), student_id (uuid), fee_id (uuid), institute_id (uuid), amount (numeric),
// payment_date (date/timestamptz), payment_method (text), reference_number (text),
// receipt_number (text), status (text), collected_by (uuid), created_at (timestamptz)

export async function fetchPayments(instituteId) {
  if (!instituteId) return [];

  try {
    const response = await client()
      .from('payments')
      .select('*, students(id, full_name, student_id_code), fees(id, total_amount, paid_amount, due_amount)')
      .eq('institute_id', instituteId)
      .order('created_at', { ascending: false });

    if (response.error) {
      const plainRes = await client()
        .from('payments')
        .select('*')
        .eq('institute_id', instituteId)
        .order('created_at', { ascending: false });
      if (plainRes.error) throw plainRes.error;
      return plainRes.data || [];
    }

    return response.data || [];
  } catch (err) {
    console.error('fetchPayments error:', err.message || err);
    throw err;
  }
}

export async function fetchPaymentsByFeeId(feeId, instituteId) {
  if (!feeId || !instituteId) return [];

  const response = await client()
    .from('payments')
    .select('*, students(id, full_name, student_id_code)')
    .eq('fee_id', feeId)
    .eq('institute_id', instituteId)
    .order('created_at', { ascending: false });

  if (response.error) throw response.error;
  return response.data || [];
}

export async function recordPayment(paymentData, instituteId) {
  if (!instituteId) {
    const err = new Error('Institute ID is required.');
    err.code = 'INSTITUTE_REQUIRED';
    throw err;
  }
  if (!paymentData.student_id) {
    const err = new Error('Student selection is required.');
    err.code = 'STUDENT_REQUIRED';
    throw err;
  }

  const amountNum = Number(paymentData.amount);
  if (isNaN(amountNum) || amountNum <= 0) {
    const err = new Error('Payment amount must be a positive number greater than 0.');
    err.code = 'INVALID_AMOUNT';
    throw err;
  }

  // Resolve authenticated user's UUID for collected_by (uuid column)
  let collectedByUserId = null;
  try {
    const { data: authData } = await client().auth.getUser();
    collectedByUserId = authData?.user?.id || null;
  } catch (authErr) {
    console.warn('Could not resolve authenticated user for collected_by:', authErr?.message);
  }

  if (!collectedByUserId) {
    const errObj = new Error('Authenticated user session is required to record a payment. Please sign in again.');
    errObj.code = 'AUTH_REQUIRED';
    throw errObj;
  }

  // Pre-fetch & validate associated fee structure and overpayment limit
  let existingFee = null;
  if (paymentData.fee_id) {
    const { data: feeRow, error: feeFetchErr } = await client()
      .from('fees')
      .select('id, total_amount, discount_amount, paid_amount, due_amount')
      .eq('id', paymentData.fee_id)
      .eq('institute_id', instituteId)
      .maybeSingle();

    if (feeFetchErr) {
      console.warn('Fee fetch check error:', feeFetchErr.message);
    }

    if (feeRow) {
      existingFee = feeRow;
      const netFee = Math.max(0, Number(feeRow.total_amount || 0) - Number(feeRow.discount_amount || 0));
      const currentPaid = Number(feeRow.paid_amount || 0);
      const remainingDue = Math.max(0, netFee - currentPaid);

      if (amountNum > remainingDue) {
        const errObj = new Error(`Payment cannot exceed the remaining fee balance of ₹${remainingDue.toLocaleString()}.`);
        errObj.code = 'PAYMENT_EXCEEDS_DUE';
        throw errObj;
      }
    }
  }

  const receiptNum =
    paymentData.receipt_number ||
    `REC-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`;

  const methodRaw = paymentData.payment_method || paymentData.payment_mode || 'cash';
  const finalMethod = normalizePaymentMethod(methodRaw);
  const finalStatus = normalizePaymentStatus(paymentData.status || 'success');

  const payload = {
    institute_id: instituteId,
    student_id: paymentData.student_id,
    fee_id: paymentData.fee_id || null,
    amount: amountNum,
    payment_date: paymentData.payment_date || new Date().toISOString().slice(0, 10),
    payment_method: finalMethod,
    reference_number: paymentData.reference_number || paymentData.transaction_id || null,
    receipt_number: receiptNum,
    status: finalStatus,
    collected_by: collectedByUserId,
  };

  if (typeof console !== 'undefined' && console.log) {
    console.log('[RECORD PAYMENT] payload', payload);
  }

  const response = await client().from('payments').insert([payload]).select().single();
  if (response.error) {
    const error = response.error;
    console.error('[RECORD PAYMENT ERROR]', {
      code: error?.code,
      message: error?.message,
      details: error?.details,
      hint: error?.hint,
    });
    const errObj = new Error(error?.message || `Payment database error (code ${error?.code})`);
    errObj.code = error?.code;
    errObj.details = error?.details;
    errObj.hint = error?.hint;
    throw errObj;
  }
  const createdPayment = response.data;

  // Update associated Fee Ledger record
  if (paymentData.fee_id && existingFee) {
    try {
      const netFee = Math.max(0, Number(existingFee.total_amount || 0) - Number(existingFee.discount_amount || 0));
      const currentPaid = Number(existingFee.paid_amount || 0);
      const newPaid = currentPaid + amountNum;
      const newDue = Math.max(0, netFee - newPaid);
      const newStatus = newDue === 0 ? 'paid' : newPaid > 0 ? 'partial' : 'pending';

      await client()
        .from('fees')
        .update({
          paid_amount: newPaid,
          due_amount: newDue,
          payment_status: newStatus,
        })
        .eq('id', paymentData.fee_id)
        .eq('institute_id', instituteId);
    } catch (ledgerErr) {
      console.warn('Fee ledger update warning:', ledgerErr?.message || ledgerErr);
    }
  }

  return createdPayment;
}
