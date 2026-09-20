import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuthContext } from '../contexts/AuthContext';

const client = () => { if (!supabase) throw new Error('Supabase is not configured.'); return supabase; };

export function useMyStudentRecord() {
  const { user } = useAuthContext();

  return useQuery({
    queryKey: ['myStudentRecord', user?.id],
    queryFn: async () => {
      if (!user?.id) throw new Error('User is not authenticated.');
      const response = await client()
        .from('students')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();
      if (response.error) throw response.error;
      return response.data;
    },
    enabled: !!user?.id,
  });
}

export async function fetchStudentByUserId(userId) {
  const response = await client()
    .from('students')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();
  if (response.error) throw response.error;
  return response.data;
}
