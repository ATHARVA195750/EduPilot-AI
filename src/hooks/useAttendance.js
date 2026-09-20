import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useInstitute } from '../contexts/InstituteContext';
import {
  fetchAttendance,
  fetchAttendanceBySession,
  fetchBatchStudentsForAttendance,
  saveSessionAttendance,
} from '../services/attendanceService';

export function useAttendance(filters = {}) {
  const { instituteId } = useInstitute();

  return useQuery({
    queryKey: ['attendance', instituteId, filters],
    queryFn: async () => {
      return fetchAttendance(filters);
    },
    enabled: true,
  });
}

export function useSessionAttendance(classSessionId) {
  return useQuery({
    queryKey: ['sessionAttendance', classSessionId],
    queryFn: async () => {
      if (!classSessionId) return [];
      return fetchAttendanceBySession(classSessionId);
    },
    enabled: Boolean(classSessionId),
  });
}

export function useBatchStudentsForAttendance(batchId) {
  const { instituteId } = useInstitute();

  return useQuery({
    queryKey: ['batchStudentsAttendance', batchId, instituteId],
    queryFn: async () => {
      if (!batchId) return [];
      return fetchBatchStudentsForAttendance(batchId, instituteId);
    },
    enabled: Boolean(batchId),
  });
}

export function useSaveAttendance() {
  const queryClient = useQueryClient();
  const { instituteId } = useInstitute();

  return useMutation({
    mutationFn: async (payload) => {
      return saveSessionAttendance({ ...payload, institute_id: instituteId });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
      queryClient.invalidateQueries({ queryKey: ['sessionAttendance', variables.class_session_id] });
      queryClient.invalidateQueries({ queryKey: ['myAttendance'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

// Re-export service helper functions for backward compatibility
export { fetchAttendance, saveSessionAttendance, fetchAttendanceBySession };