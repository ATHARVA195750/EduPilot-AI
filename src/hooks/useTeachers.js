import { useQuery } from '@tanstack/react-query';
import { fetchTeachers } from '../services/teacherService';
import { useInstitute } from '../contexts/InstituteContext';

export function useTeachers() {
  const { instituteId } = useInstitute();
  const query = useQuery({
    queryKey: ['teachers', instituteId],
    queryFn: async () => {
      return fetchTeachers(instituteId);
    },
    enabled: true,
  });

  return {
    teachers: query.data || [],
    data: query.data || [],
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}
