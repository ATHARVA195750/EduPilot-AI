import { useState, useEffect, useCallback } from 'react';
import {
  fetchSchedules,
  fetchStudentSchedules,
  createSchedule,
  updateClassSession,
  cancelClassSession,
  deleteClassSession,
  checkScheduleConflicts,
  validateTeacherAssignment
} from '../services/timetableService';
import { useInstitute } from '../contexts/InstituteContext';
import { useQuery } from '@tanstack/react-query';
import { useMyStudentRecord } from './useMyStudentRecord';

export function useTimetable() {
  const { instituteId } = useInstitute();
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const list = await fetchSchedules(instituteId);
      setSchedules(list);
    } catch (err) {
      console.warn('useTimetable error:', err);
    } finally {
      setLoading(false);
    }
  }, [instituteId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const addSchedule = async (data) => {
    // 1. Teacher assignment validation
    if (data.teacher_id && data.batch_id) {
      const isValidAssignment = await validateTeacherAssignment(data.teacher_id, data.batch_id, data.subject_id);
      if (!isValidAssignment) {
        throw new Error('Selected faculty instructor is not assigned to teach this batch and subject.');
      }
    }

    // 2. Conflict check
    const conflicts = checkScheduleConflicts(schedules, data);
    if (conflicts.length > 0) {
      throw new Error(conflicts.join('\n'));
    }

    const created = await createSchedule(data, instituteId);
    await loadData();
    return created;
  };

  const updateSchedule = async (id, data) => {
    // 1. Teacher assignment validation
    if (data.teacher_id && data.batch_id) {
      const isValidAssignment = await validateTeacherAssignment(data.teacher_id, data.batch_id, data.subject_id);
      if (!isValidAssignment) {
        throw new Error('Selected faculty instructor is not assigned to teach this batch and subject.');
      }
    }

    // 2. Conflict check (excluding current session ID)
    const conflicts = checkScheduleConflicts(schedules, data, id);
    if (conflicts.length > 0) {
      throw new Error(conflicts.join('\n'));
    }

    const updated = await updateClassSession(id, data, instituteId);
    await loadData();
    return updated;
  };

  const cancelSchedule = async (id) => {
    const cancelled = await cancelClassSession(id);
    await loadData();
    return cancelled;
  };

  const deleteSchedule = async (id, batchId, sessionDate) => {
    const result = await deleteClassSession(id, batchId, sessionDate);
    await loadData();
    return result;
  };

  return {
    schedules,
    loading,
    refresh: loadData,
    addSchedule,
    updateSchedule,
    cancelSchedule,
    deleteSchedule,
    checkConflicts: (slot, currentId) => checkScheduleConflicts(schedules, slot, currentId)
  };
}

export function useMyTimetable() {
  const { instituteId } = useInstitute();
  const { data: studentRecord } = useMyStudentRecord();

  return useQuery({
    queryKey: ['myTimetable', instituteId, studentRecord?.batch_id],
    queryFn: () => fetchStudentSchedules(instituteId, studentRecord.batch_id),
    enabled: Boolean(instituteId && studentRecord?.batch_id),
    placeholderData: [],
  });
}

