import { useState, useEffect, useCallback } from 'react';
import {
  generateFeeReport,
  generateFinancialReport,
  generateAttendanceReport,
  generateAdmissionsReport,
  fetchStudentReportCardData,
  exportToCSV,
} from '../services/reportService';
import { useInstitute } from '../contexts/InstituteContext';

export function useReports() {
  const { instituteId, institute } = useInstitute();
  const activeInstituteId = instituteId || institute?.id;

  const [feeReport, setFeeReport] = useState(null);
  const [financialReport, setFinancialReport] = useState(null);
  const [attendanceReport, setAttendanceReport] = useState(null);
  const [admissionsReport, setAdmissionsReport] = useState(null);
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
      const [fees, fin, att, adm] = await Promise.all([
        generateFeeReport(activeInstituteId),
        generateFinancialReport(activeInstituteId),
        generateAttendanceReport(activeInstituteId),
        generateAdmissionsReport(activeInstituteId),
      ]);
      setFeeReport(fees);
      setFinancialReport(fin);
      setAttendanceReport(att);
      setAdmissionsReport(adm);
    } catch (err) {
      console.error('useReports error:', err);
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [activeInstituteId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const fetchStudentCard = useCallback(
    async (studentId) => {
      return fetchStudentReportCardData(studentId, activeInstituteId);
    },
    [activeInstituteId]
  );

  return {
    feeReport,
    financialReport,
    attendanceReport,
    admissionsReport,
    loading,
    error,
    refresh: loadData,
    fetchStudentCard,
    exportCSV: exportToCSV,
  };
}

