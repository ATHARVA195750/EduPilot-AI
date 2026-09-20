import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuthContext } from '../contexts/AuthContext';
import { useMyStudentRecord } from './useMyStudentRecord';

const client = () => { if (!supabase) throw new Error('Supabase is not configured.'); return supabase; };

export function useMyAttendance() {
  const { user } = useAuthContext();
  const { data: studentRecord } = useMyStudentRecord();

  return useQuery({
    queryKey: ['myAttendance', user?.id, studentRecord?.id],
    queryFn: async () => {
      if (!user?.id || !studentRecord?.id) return [];
      const response = await client()
        .from('attendance')
        .select('*')
        .eq('student_id', studentRecord.id)
        .order('attendance_date', { ascending: false });
      if (response.error) throw response.error;
      return response.data || [];
    },
    enabled: !!user?.id && !!studentRecord?.id,
    placeholderData: [],
  });
}
