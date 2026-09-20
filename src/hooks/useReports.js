import { useState, useEffect, useCallback } from 'react';
import { generateFeeReport, generateFinancialReport, exportToCSV } from '../services/reportService';
import { useInstitute } from '../contexts/InstituteContext';

export function useReports() {
  const { instituteId } = useInstitute();
  const [feeReport, setFeeReport] = useState(null);
  const [financialReport, setFinancialReport] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const fees = await generateFeeReport();
      setFeeReport(fees);
      const fin = await generateFinancialReport(instituteId);
      setFinancialReport(fin);
    } catch (err) {
      console.warn('useReports error:', err);
    } finally {
      setLoading(false);
    }
  }, [instituteId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return { feeReport, financialReport, loading, refresh: loadData, exportCSV: exportToCSV };
}
