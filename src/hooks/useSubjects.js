import { useState, useEffect, useCallback } from 'react';
import { fetchSubjects, createSubject, deleteSubject } from '../services/subjectService';
import { useInstitute } from '../contexts/InstituteContext';

export function useSubjects(courseId = null) {
  const { instituteId } = useInstitute();
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const list = await fetchSubjects(courseId);
      setSubjects(list);
    } catch (err) {
      console.warn('useSubjects error:', err);
    } finally {
      setLoading(false);
    }
  }, [courseId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const addSubject = async (data) => {
    const created = await createSubject(data, instituteId);
    await loadData();
    return created;
  };

  const removeSubject = async (id) => {
    await deleteSubject(id);
    await loadData();
  };

  return { subjects, loading, refresh: loadData, addSubject, removeSubject };
}
