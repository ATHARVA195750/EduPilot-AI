import { useQuery } from '@tanstack/react-query';
import { apiGet } from '../lib/apiClient';
import { useAuthContext } from '../contexts/AuthContext';
import { useMyStudentRecord } from './useMyStudentRecord';

export function useMyAttendance() {
  const { user } = useAuthContext();
  const { data: studentRecord } = useMyStudentRecord();

  return useQuery({
    queryKey: ['myAttendance', user?.id, studentRecord?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      try {
        const records = await apiGet('/attendance');
        return records || [];
      } catch {
        return [];
      }
    },
    enabled: !!user?.id,
    placeholderData: [],
  });
}

