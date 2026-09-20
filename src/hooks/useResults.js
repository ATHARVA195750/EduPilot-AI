import { useQuery } from '@tanstack/react-query';
import { fetchResults } from '../services/resultService';
import { useInstitute } from '../contexts/InstituteContext';

export function useResults() {
  const{institute}=useInstitute();return useQuery({queryKey:['results',institute?.id],queryFn:async()=>{if(!institute?.id)throw new Error('Institute is not ready.');return fetchResults();},enabled:Boolean(institute?.id)});
}
