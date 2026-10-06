/**
 * subjectService.js — FastAPI backend edition.
 */
import { apiGet, apiPost, apiDelete } from '../lib/apiClient';

export async function fetchSubjects(courseId) {
  try {
    const params = courseId ? { course_id: courseId } : {};
    const data = await apiGet('/academics/subjects', params);
    return data || [];
  } catch (err) {
    console.error('Error in fetchSubjects:', err);
    return [];
  }
}

export async function createSubject(subjectData, instituteId) {
  const payload = {
    course_id: subjectData.course_id,
    name: subjectData.name,
    code: subjectData.code || null,
    description: subjectData.description || null,
  };
  return apiPost('/academics/subjects', payload);
}

export async function deleteSubject(id) {
  return apiDelete(`/academics/subjects/${id}`);
}

