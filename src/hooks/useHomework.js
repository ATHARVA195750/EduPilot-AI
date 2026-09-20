import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useInstitute } from '../contexts/InstituteContext';
import {
  fetchHomework,
  createHomework,
  updateHomework,
  deleteHomework,
} from '../services/homeworkService';

export function useHomework(filters = {}) {
  const { instituteId } = useInstitute();

  return useQuery({
    queryKey: ['homework', instituteId, filters],
    queryFn: async () => {
      return fetchHomework(filters);
    },
    enabled: true,
  });
}

export function useCreateHomework() {
  const queryClient = useQueryClient();
  const { instituteId } = useInstitute();

  return useMutation({
    mutationFn: async (payload) => {
      return createHomework({ ...payload, institute_id: instituteId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['homework'] });
      queryClient.invalidateQueries({ queryKey: ['myHomework'] });
    },
  });
}

export function useUpdateHomework() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }) => {
      return updateHomework(id, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['homework'] });
      queryClient.invalidateQueries({ queryKey: ['myHomework'] });
    },
  });
}

export function useDeleteHomework() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id) => {
      return deleteHomework(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['homework'] });
      queryClient.invalidateQueries({ queryKey: ['myHomework'] });
    },
  });
}
