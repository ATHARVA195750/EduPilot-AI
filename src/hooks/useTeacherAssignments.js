import { useState, useEffect, useCallback } from 'react';
import {
  fetchTeacherAssignments,
  createTeacherAssignment,
  updateTeacherAssignmentStatus,
} from '../services/teacherAssignmentService';
import { useInstitute } from '../contexts/InstituteContext';

export function useTeacherAssignments(teacherId = null) {
  const { instituteId } = useInstitute();
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const list = await fetchTeacherAssignments(teacherId);
      setAssignments(list);
    } catch (err) {
      console.warn('useTeacherAssignments error:', err);
    } finally {
      setLoading(false);
    }
  }, [teacherId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const addAssignment = async (data) => {
    const created = await createTeacherAssignment(data, instituteId);
    await loadData();
    return created;
  };

  const changeStatus = async (id, status) => {
    const updated = await updateTeacherAssignmentStatus(id, status);
    await loadData();
    return updated;
  };

  return { assignments, loading, refresh: loadData, addAssignment, changeStatus };
}
