import { useQuery } from '@tanstack/react-query';
import { fetchFees } from '../services/feeService';
import { useInstitute } from '../contexts/InstituteContext';

export function useFees() {
  const { institute } = useInstitute();
  return useQuery({
    queryKey: ['fees', institute?.id],
    queryFn: async () => {
      if (!institute?.id) throw new Error('Institute is not ready.');
      return fetchFees(institute.id);
    },
    enabled: Boolean(institute?.id),
  });
}
