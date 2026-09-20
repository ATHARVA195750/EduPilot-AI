import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useInstitute } from '../contexts/InstituteContext';
import {
  fetchStudyMaterials,
  createStudyMaterial,
  updateStudyMaterial,
  togglePublishStudyMaterial,
  deleteStudyMaterial,
} from '../services/studyMaterialService';

export function useStudyMaterial(filters = {}) {
  const { instituteId } = useInstitute();

  return useQuery({
    queryKey: ['studyMaterials', instituteId, filters],
    queryFn: async () => {
      return fetchStudyMaterials(filters);
    },
    enabled: true,
  });
}

export function useCreateStudyMaterial() {
  const queryClient = useQueryClient();
  const { instituteId } = useInstitute();

  return useMutation({
    mutationFn: async (payload) => {
      return createStudyMaterial({ ...payload, institute_id: instituteId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['studyMaterials'] });
      queryClient.invalidateQueries({ queryKey: ['myStudyMaterials'] });
    },
  });
}

export function useUpdateStudyMaterial() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }) => {
      return updateStudyMaterial(id, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['studyMaterials'] });
      queryClient.invalidateQueries({ queryKey: ['myStudyMaterials'] });
    },
  });
}

export function useTogglePublishStudyMaterial() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, is_published }) => {
      return togglePublishStudyMaterial(id, is_published);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['studyMaterials'] });
      queryClient.invalidateQueries({ queryKey: ['myStudyMaterials'] });
    },
  });
}

export function useDeleteStudyMaterial() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id) => {
      return deleteStudyMaterial(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['studyMaterials'] });
      queryClient.invalidateQueries({ queryKey: ['myStudyMaterials'] });
    },
  });
}
