import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuthContext } from '../contexts/AuthContext';
import { useMyStudentRecord } from './useMyStudentRecord';

const client = () => {
  if (!supabase) throw new Error('Supabase is not configured.');
  return supabase;
};

export function useMyResults() {
  const { user } = useAuthContext();
  const { data: studentRecord } = useMyStudentRecord();

  return useQuery({
    queryKey: ['myResults', user?.id, studentRecord?.id],
    queryFn: async () => {
      if (!user?.id || !studentRecord?.id) return [];
      const response = await client()
        .from('results')
        .select('*, tests(id, title, test_name, subject, test_date, total_marks)')
        .eq('student_id', studentRecord.id)
        .order('created_at', { ascending: false });

      if (response.error) throw response.error;
      return response.data || [];
    },
    enabled: !!user?.id && !!studentRecord?.id,
    placeholderData: [],
  });
}
