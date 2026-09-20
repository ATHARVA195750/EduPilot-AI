import { useQuery } from '@tanstack/react-query';
import { useMyStudentRecord } from './useMyStudentRecord';
import { fetchStudentHomework } from '../services/homeworkService';

export function useMyHomework() {
  const { data: studentRecord } = useMyStudentRecord();

  return useQuery({
    queryKey: ['myHomework', studentRecord?.batch_id, studentRecord?.standard],
    queryFn: async () => {
      if (!studentRecord?.batch_id && !studentRecord?.standard) return [];
      return fetchStudentHomework({
        batch_id: studentRecord?.batch_id,
        standard: studentRecord?.standard,
      });
    },
    enabled: Boolean(studentRecord?.batch_id || studentRecord?.standard),
  });
}
