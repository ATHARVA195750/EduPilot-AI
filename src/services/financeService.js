import { supabase } from '../lib/supabase';

const client = () => {
  if (!supabase) throw new Error('Supabase is not configured.');
  return supabase;
};

// Live public.expenses table schema:
// id (uuid), institute_id (uuid), category (text), amount (numeric),
// expense_date (date), payment_method (text), description (text), created_at (timestamptz)

export async function fetchExpenses(instituteId) {
  if (!instituteId) return [];

  try {
    const response = await client()
      .from('expenses')
      .select('*')
      .eq('institute_id', instituteId)
      .order('created_at', { ascending: false });

    if (response.error) throw response.error;
    return response.data || [];
  } catch (err) {
    console.error('fetchExpenses error:', err.message || err);
    throw err;
  }
}

export async function addExpense(expenseData, instituteId) {
  if (!instituteId) throw new Error('Institute ID is required.');

  const amountNum = Number(expenseData.amount);
  if (isNaN(amountNum) || amountNum <= 0) {
    throw new Error('Expense amount must be a positive number greater than 0.');
  }

  const payload = {
    institute_id: instituteId,
    category: expenseData.category || expenseData.title || 'General Expense',
    amount: amountNum,
    expense_date: expenseData.expense_date || expenseData.date || new Date().toISOString().slice(0, 10),
    payment_method: expenseData.payment_method || expenseData.payment_mode || 'Cash',
    description: expenseData.description || null,
  };

  if (typeof console !== 'undefined' && console.log) {
    console.log('[ADD EXPENSE] payload', payload);
  }

  const response = await client().from('expenses').insert([payload]).select().single();
  if (response.error) throw response.error;
  return response.data;
}

export async function getFinancialSummary(instituteId) {
  if (!instituteId) {
    return { totalRevenue: 0, totalExpenses: 0, netIncome: 0, marginPercentage: '0.0' };
  }

  try {
    const [paymentsRes, expensesRes] = await Promise.all([
      client().from('payments').select('amount').eq('institute_id', instituteId),
      client().from('expenses').select('amount').eq('institute_id', instituteId),
    ]);

    const payments = paymentsRes.data || [];
    const expenses = expensesRes.data || [];

    const totalRevenue = payments.reduce((acc, p) => acc + (Number(p.amount) || 0), 0);
    const totalExpenses = expenses.reduce((acc, e) => acc + (Number(e.amount) || 0), 0);
    const netIncome = totalRevenue - totalExpenses;
    const marginPercentage = totalRevenue > 0 ? ((netIncome / totalRevenue) * 100).toFixed(1) : '0.0';

    return {
      totalRevenue,
      totalExpenses,
      netIncome,
      marginPercentage,
    };
  } catch (err) {
    console.error('getFinancialSummary error:', err.message || err);
    return { totalRevenue: 0, totalExpenses: 0, netIncome: 0, marginPercentage: '0.0' };
  }
}
