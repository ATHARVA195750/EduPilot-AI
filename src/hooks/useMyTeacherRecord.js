import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuthContext } from '../contexts/AuthContext';

export function useMyTeacherRecord() {
  const { user } = useAuthContext();

  return useQuery({
    queryKey: ['myTeacherRecord', user?.id],
    queryFn: async () => {
      if (!user?.id) throw new Error('User is not authenticated.');
      if (!supabase) return null;

      // 1. Match by user_id
      const { data: byUserId, error: errUserId } = await supabase
        .from('teachers')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!errUserId && byUserId) {
        return byUserId;
      }

      // 2. Secondary database lookup by email if user_id was not populated during onboarding
      if (user.email) {
        const { data: byEmail, error: errEmail } = await supabase
          .from('teachers')
          .select('*')
          .eq('email', user.email)
          .maybeSingle();

        if (!errEmail && byEmail) {
          return byEmail;
        }
      }

      // Return null if no linked teacher record exists for the user
      return null;
    },
    enabled: !!user?.id,
  });
}

