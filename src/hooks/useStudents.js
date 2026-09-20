import { useQuery } from '@tanstack/react-query';
import { fetchStudents } from '../services/studentService';
import { useInstitute } from '../contexts/InstituteContext';

export function useStudents() {
  const { instituteId } = useInstitute();
  return useQuery({
    queryKey: ['students', instituteId],
    queryFn: async () => {
      return fetchStudents(instituteId);
    },
    enabled: true,
  });
}
