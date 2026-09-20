import { useState, useEffect, useCallback } from 'react';
import { fetchCourses, createCourse, updateCourse } from '../services/courseService';
import { useInstitute } from '../contexts/InstituteContext';

export function useCourses() {
  const { instituteId } = useInstitute();
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const list = await fetchCourses(instituteId);
      setCourses(list);
    } catch (err) {
      console.warn('useCourses error:', err);
    } finally {
      setLoading(false);
    }
  }, [instituteId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const addCourse = async (data) => {
    const created = await createCourse(data, instituteId);
    await loadData();
    return created;
  };

  const editCourse = async (id, data) => {
    const updated = await updateCourse(id, data);
    await loadData();
    return updated;
  };

  return { courses, loading, refresh: loadData, addCourse, editCourse };
}
