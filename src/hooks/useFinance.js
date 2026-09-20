import { useState, useEffect, useCallback } from 'react';
import { fetchExpenses, addExpense, getFinancialSummary } from '../services/financeService';
import { useInstitute } from '../contexts/InstituteContext';

export function useFinance() {
  const { instituteId, institute } = useInstitute();
  const activeInstituteId = instituteId || institute?.id;

  const [expenses, setExpenses] = useState([]);
  const [summary, setSummary] = useState({ totalRevenue: 0, totalExpenses: 0, netIncome: 0, marginPercentage: '0.0' });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadData = useCallback(async () => {
    if (!activeInstituteId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const expList = await fetchExpenses(activeInstituteId);
      setExpenses(expList);
      const sum = await getFinancialSummary(activeInstituteId);
      setSummary(sum);
    } catch (err) {
      console.error('useFinance error:', err);
      setError(err);
      setExpenses([]);
    } finally {
      setLoading(false);
    }
  }, [activeInstituteId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const recordExpense = async (data) => {
    const created = await addExpense(data, activeInstituteId);
    setExpenses((prev) => [created, ...prev]);
    await loadData();
    return created;
  };

  return { expenses, summary, loading, error, refresh: loadData, recordExpense };
}
