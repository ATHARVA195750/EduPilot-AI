import { useState, useEffect, useCallback } from 'react';
import { fetchPayroll, processPayrollItem } from '../services/payrollService';
import { useInstitute } from '../contexts/InstituteContext';

const logPayrollFetch = (...args) => {
  if (import.meta.env.DEV) console.info(...args);
};

export function usePayroll() {
  const { instituteId, institute, user, role, loading: instituteLoading } = useInstitute();
  const activeInstituteId = instituteId || institute?.id;

  const [payroll, setPayroll] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadData = useCallback(async () => {
    logPayrollFetch('[PAYROLL DEBUG] [PAYROLL FETCH START]', {
      loading: true,
      instituteId: activeInstituteId || null,
      userId: user?.id || null,
      role: role || null,
      instituteLoading,
    });
    if (instituteLoading) {
      setLoading(true);
      return;
    }
    if (!activeInstituteId) {
      setPayroll([]);
      setError(new Error('Institute context is unavailable. Please refresh and try again.'));
      setLoading(false);
      logPayrollFetch('[PAYROLL FETCH ERROR]', { loading: false, error: 'INSTITUTE_REQUIRED', dataCount: 0 });
      logPayrollFetch('[PAYROLL FETCH FINALLY]', { loading: false, error: 'INSTITUTE_REQUIRED', dataCount: 0 });
      return;
    }
    setLoading(true);
    setError(null);
    let finalDataLength = 0;
    let finalError = null;
    try {
      const list = await fetchPayroll(activeInstituteId);
      const results = Array.isArray(list) ? list : [];
      setPayroll(results);
      finalDataLength = results.length;
      logPayrollFetch('[PAYROLL FETCH SUCCESS]', { loading: false, error: null, dataCount: results.length });
    } catch (err) {
      console.error('usePayroll error:', err);
      setError(err);
      setPayroll([]);
      finalError = err?.message || String(err);
      logPayrollFetch('[PAYROLL FETCH ERROR]', { loading: false, error: err?.message || String(err), dataCount: 0 });
    } finally {
      setLoading(false);
      logPayrollFetch('[PAYROLL FETCH FINALLY]', { loading: false, dataCount: finalDataLength, error: finalError });
    }
  }, [activeInstituteId, instituteLoading, role, user?.id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const addPayrollRecord = async (data) => {
    const created = await processPayrollItem(data, activeInstituteId);
    setPayroll((prev) => [created, ...prev]);
    return created;
  };

  return { payroll, loading, error, refresh: loadData, addPayrollRecord };
}
