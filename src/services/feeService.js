import { supabase } from '../lib/supabase';

const client = () => {
  if (!supabase) throw new Error('Supabase is not configured.');
  return supabase;
};

// Live public.fees table schema:
// id (uuid), student_id (uuid), institute_id (uuid), total_amount (numeric),
// paid_amount (numeric), due_amount (numeric), discount_amount (numeric),
// due_date (date), payment_status (text), payment_mode (text), receipt_number (text), created_at (timestamptz)

export async function fetchFees(instituteId) {
  if (!instituteId) return [];

  try {
    const response = await client()
      .from('fees')
      .select('*, students(id, full_name, student_id_code, standard, batch_id)')
      .eq('institute_id', instituteId)
      .order('created_at', { ascending: false });

    if (response.error) {
      // Fallback if join syntax fails or schema restriction occurs
      const plainRes = await client()
        .from('fees')
        .select('*')
        .eq('institute_id', instituteId)
        .order('created_at', { ascending: false });
      if (plainRes.error) throw plainRes.error;
      return plainRes.data || [];
    }

    return response.data || [];
  } catch (err) {
    console.error('fetchFees error:', err.message || err);
    throw err;
  }
}

export async function fetchFeeById(id, instituteId) {
  if (!id || !instituteId) return null;

  const response = await client()
    .from('fees')
    .select('*, students(id, full_name, student_id_code, standard, batch_id)')
    .eq('id', id)
    .eq('institute_id', instituteId)
    .maybeSingle();

  if (response.error) throw response.error;
  return response.data;
}

export async function createFee(feeData, instituteId) {
  if (!instituteId) throw new Error('Institute ID is required.');
  if (!feeData.student_id) throw new Error('Student selection is required.');

  const totalAmount = Number(feeData.total_amount ?? feeData.amount ?? 0);
  const discountAmount = Number(feeData.discount_amount ?? feeData.discount ?? 0);

  if (isNaN(totalAmount) || totalAmount < 0) {
    throw new Error('Total amount must be a valid non-negative number.');
  }
  if (isNaN(discountAmount) || discountAmount < 0) {
    throw new Error('Discount amount must be a valid non-negative number.');
  }
  if (discountAmount > totalAmount) {
    throw new Error('Discount amount cannot exceed total fee amount.');
  }

  const netFee = totalAmount - discountAmount;
  const paidAmount = Number(feeData.paid_amount ?? 0);
  const dueAmount = Math.max(0, netFee - paidAmount);
  const status = feeData.payment_status || (dueAmount === 0 ? 'paid' : paidAmount > 0 ? 'partial' : 'pending');

  const receiptNum =
    feeData.receipt_number ||
    `REC-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`;

  const payload = {
    institute_id: instituteId,
    student_id: feeData.student_id,
    total_amount: totalAmount,
    discount_amount: discountAmount,
    paid_amount: paidAmount,
    due_amount: dueAmount,
    due_date: feeData.due_date || null,
    payment_status: status,
    payment_mode: feeData.payment_mode || feeData.payment_method || 'cash',
    receipt_number: receiptNum,
  };

  if (typeof console !== 'undefined' && console.log) {
    console.log('[CREATE FEE] payload', payload);
  }

  const response = await client().from('fees').insert([payload]).select().single();
  if (response.error) throw response.error;
  return response.data;
}

export async function updateFeeStatus(feeId, updates, instituteId) {
  if (!feeId || !instituteId) throw new Error('Fee ID and Institute ID are required.');

  const payload = {};
  if (updates.paid_amount !== undefined) payload.paid_amount = Number(updates.paid_amount);
  if (updates.due_amount !== undefined) payload.due_amount = Number(updates.due_amount);
  if (updates.payment_status !== undefined) payload.payment_status = updates.payment_status;
  if (updates.payment_mode !== undefined) payload.payment_mode = updates.payment_mode;
  if (updates.discount_amount !== undefined) payload.discount_amount = Number(updates.discount_amount);
  if (updates.due_date !== undefined) payload.due_date = updates.due_date;

  const response = await client()
    .from('fees')
    .update(payload)
    .eq('id', feeId)
    .eq('institute_id', instituteId)
    .select()
    .single();

  if (response.error) throw response.error;
  return response.data;
}