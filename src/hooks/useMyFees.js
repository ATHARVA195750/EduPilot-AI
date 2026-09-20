import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuthContext } from '../contexts/AuthContext';
import { useMyStudentRecord } from './useMyStudentRecord';

const client = () => { if (!supabase) throw new Error('Supabase is not configured.'); return supabase; };

export function useMyFees() {
  const { user } = useAuthContext();
  const { data: studentRecord } = useMyStudentRecord();

  return useQuery({
    queryKey: ['myFees', user?.id, studentRecord?.id],
    queryFn: async () => {
      if (!user?.id || !studentRecord?.id) return [];
      const response = await client()
        .from('fees')
        .select('*')
        .eq('student_id', studentRecord.id)
        .order('created_at', { ascending: false });
      if (response.error) throw response.error;
      return response.data || [];
    },
    enabled: !!user?.id && !!studentRecord?.id,
    placeholderData: [],
  });
}
