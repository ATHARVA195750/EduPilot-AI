import { useQuery } from '@tanstack/react-query';
import { apiGet } from '../lib/apiClient';
import { useAuthContext } from '../contexts/AuthContext';

export function useMyTeacherRecord() {
  const { user } = useAuthContext();

  return useQuery({
    queryKey: ['myTeacherRecord', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      try {
        const teacher = await apiGet('/teachers/me');
        return teacher || null;
      } catch {
        return null;
      }
    },
    enabled: !!user?.id,
  });
}


