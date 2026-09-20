import { useQuery } from '@tanstack/react-query';
import { fetchStudentTests, fetchTests } from '../services/testService';
import { useInstitute } from '../contexts/InstituteContext';
import { useMyStudentRecord } from './useMyStudentRecord';

export function useTests() {
  const{institute}=useInstitute();return useQuery({queryKey:['tests',institute?.id],queryFn:async()=>{if(!institute?.id)throw new Error('Institute is not ready.');return fetchTests(institute.id);},enabled:Boolean(institute?.id)});
}

export function useMyTests() {
  const { instituteId } = useInstitute();
  const { data: studentRecord } = useMyStudentRecord();

  return useQuery({
    queryKey: ['myTests', instituteId, studentRecord?.batch_id, studentRecord?.standard],
    queryFn: () => fetchStudentTests(instituteId, {
      batchId: studentRecord?.batch_id,
      standard: studentRecord?.standard,
    }),
    enabled: Boolean(instituteId && (studentRecord?.batch_id || studentRecord?.standard)),
    placeholderData: [],
  });
}
