import { useQuery } from '@tanstack/react-query';
import { fetchDashboard } from '../services/dashboardService';

export function useDashboard(instituteId) {
  return useQuery({
    queryKey: ['dashboard', instituteId],
    queryFn: async () => {
      const res = await fetchDashboard(instituteId);
      return {
        students: res.students || [],
        teachers: res.teachers || [],
        attendance: res.attendance || [],
        fees: res.fees || [],
        payments: res.payments || [],
        homework: res.homework || [],
        tests: res.tests || [],
        announcements: res.announcements || [],
        batches: res.batches || [],
        expenses: res.expenses || [],
        payroll: res.payroll || [],
        enquiries: res.enquiries || [],
      };
    },
    enabled: Boolean(instituteId),
    retry: 1,
  });
}