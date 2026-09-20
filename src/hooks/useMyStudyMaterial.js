import { useQuery } from '@tanstack/react-query';
import { useMyStudentRecord } from './useMyStudentRecord';
import { fetchStudentStudyMaterials } from '../services/studyMaterialService';

export function useMyStudyMaterial() {
  const { data: studentRecord } = useMyStudentRecord();

  return useQuery({
    queryKey: ['myStudyMaterials', studentRecord?.batch_id, studentRecord?.standard],
    queryFn: async () => {
      if (!studentRecord?.batch_id && !studentRecord?.standard) return [];
      return fetchStudentStudyMaterials({
        batch_id: studentRecord?.batch_id,
        standard: studentRecord?.standard,
      });
    },
    enabled: Boolean(studentRecord?.batch_id || studentRecord?.standard),
  });
}
