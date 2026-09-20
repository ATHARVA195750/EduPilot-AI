import { useState, useEffect, useCallback } from 'react';
import { fetchPayments, recordPayment } from '../services/paymentService';
import { useInstitute } from '../contexts/InstituteContext';

export function usePayments() {
  const { instituteId, institute } = useInstitute();
  const activeInstituteId = instituteId || institute?.id;

  const [payments, setPayments] = useState([]);
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
      const list = await fetchPayments(activeInstituteId);
      setPayments(list);
    } catch (err) {
      console.error('usePayments error:', err);
      setError(err);
      setPayments([]);
    } finally {
      setLoading(false);
    }
  }, [activeInstituteId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const addPayment = async (data) => {
    const created = await recordPayment(data, activeInstituteId);
    setPayments((prev) => [created, ...prev]);
    return created;
  };

  return { payments, loading, error, refresh: loadData, addPayment };
}
