import { useQuery } from '@tanstack/react-query';
import { apiGet } from '../lib/apiClient';
import { useAuthContext } from '../contexts/AuthContext';

export function useMyStudentRecord() {
  const { user } = useAuthContext();

  return useQuery({
    queryKey: ['myStudentRecord', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      try {
        const student = await apiGet('/students/me');
        return student || null;
      } catch {
        return null;
      }
    },
    enabled: !!user?.id,
  });
}

export async function fetchStudentByUserId(userId) {
  if (!userId) return null;
  try {
    const student = await apiGet('/students/me');
    return student || null;
  } catch {
    return null;
  }
}

