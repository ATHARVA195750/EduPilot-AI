/**
 * dashboardService.js — FastAPI backend edition.
 */
import { apiGet } from '../lib/apiClient';

export async function fetchDashboard(instituteId) {
  try {
    const data = await apiGet('/reports/dashboard');
    return {
      students: data?.students || [],
      teachers: data?.teachers || [],
      attendance: data?.attendance || [],
      fees: data?.fees || [],
      payments: data?.payments || [],
      homework: data?.homework || [],
      tests: data?.tests || [],
      announcements: data?.announcements || [],
      batches: data?.batches || [],
      expenses: data?.expenses || [],
      payroll: data?.payroll || [],
      enquiries: data?.enquiries || [],
    };
  } catch (err) {
    console.error('fetchDashboard error:', err);
    return {
      students: [], teachers: [], attendance: [], fees: [],
      payments: [], homework: [], tests: [], announcements: [],
      batches: [], expenses: [], payroll: [], enquiries: []
    };
  }
}
