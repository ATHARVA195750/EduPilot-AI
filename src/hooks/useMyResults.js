import { useQuery } from '@tanstack/react-query';
import { apiGet } from '../lib/apiClient';
import { useAuthContext } from '../contexts/AuthContext';
import { useMyStudentRecord } from './useMyStudentRecord';

export function useMyResults() {
  const { user } = useAuthContext();
  const { data: studentRecord } = useMyStudentRecord();

  return useQuery({
    queryKey: ['myResults', user?.id, studentRecord?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      try {
        const results = await apiGet('/academics/results');
        return results || [];
      } catch {
        return [];
      }
    },
    enabled: !!user?.id,
    placeholderData: [],
  });
}

