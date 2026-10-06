import { useQuery } from '@tanstack/react-query';
import { apiGet } from '../lib/apiClient';
import { useAuthContext } from '../contexts/AuthContext';
import { useMyStudentRecord } from './useMyStudentRecord';

export function useMyFees() {
  const { user } = useAuthContext();
  const { data: studentRecord } = useMyStudentRecord();

  return useQuery({
    queryKey: ['myFees', user?.id, studentRecord?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      try {
        const fees = await apiGet('/finance/fees');
        return fees || [];
      } catch {
        return [];
      }
    },
    enabled: !!user?.id,
    placeholderData: [],
  });
}

