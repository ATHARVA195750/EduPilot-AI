/**
 * financeService.js — FastAPI backend edition.
 */
import { apiGet, apiPost } from '../lib/apiClient';

export async function fetchExpenses(instituteId) {
  const data = await apiGet('/finance/expenses');
  return data || [];
}

export async function addExpense(expenseData, instituteId) {
  const payload = {
    category: expenseData.category || expenseData.title || 'General Expense',
    amount: Number(expenseData.amount),
    expense_date: expenseData.expense_date || expenseData.date || new Date().toISOString().slice(0, 10),
    payment_method: (expenseData.payment_method || 'cash').toLowerCase().replace(' ', '_'),
    description: expenseData.description || null,
  };
  return apiPost('/finance/expenses', payload);
}

export async function getFinancialSummary(instituteId) {
  try {
    const data = await apiGet('/finance/summary');
    return data || { totalRevenue: 0, totalExpenses: 0, directExpenses: 0, payrollExpenses: 0, netIncome: 0, marginPercentage: '0.0' };
  } catch (err) {
    console.error('getFinancialSummary error:', err);
    return { totalRevenue: 0, totalExpenses: 0, directExpenses: 0, payrollExpenses: 0, netIncome: 0, marginPercentage: '0.0' };
  }
}
