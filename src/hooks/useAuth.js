import { useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';
import { useAuthContext } from '../contexts/AuthContext';

export function useAuth() {
  const queryClient = useQueryClient();
  const auth = useAuthContext();

  const refreshUser = async () => {
    await queryClient.invalidateQueries(['user']);
  };

  return useMemo(
    () => ({ ...auth, refreshUser }),
    [auth, queryClient]
  );
}
