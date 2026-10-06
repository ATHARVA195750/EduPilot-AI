/**
 * courseService.js — FastAPI backend edition.
 */
import { apiGet, apiPost, apiPut, apiDelete } from '../lib/apiClient';

export async function fetchCourses(instituteId) {
  const data = await apiGet('/academics/courses');
  return data || [];
}

export async function fetchCourse(id) {
  if (!id) return null;
  const data = await apiGet('/academics/courses');
  return (data || []).find((c) => c.id === id) || null;
}

export async function createCourse(courseData, instituteId) {
  return apiPost('/academics/courses', {
    name: courseData.name,
    code: courseData.code || null,
    standard: courseData.standard || null,
    board: courseData.board || null,
    duration_months: courseData.duration_months ? Number(courseData.duration_months) : null,
    base_fee: courseData.base_fee ? Number(courseData.base_fee) : null,
    description: courseData.description || null,
  });
}

export async function updateCourse(id, courseData) {
  return apiPut(`/academics/courses/${id}`, {
    name: courseData.name,
    code: courseData.code || null,
    standard: courseData.standard || null,
    board: courseData.board || null,
    duration_months: courseData.duration_months ? Number(courseData.duration_months) : null,
    base_fee: courseData.base_fee ? Number(courseData.base_fee) : null,
    description: courseData.description || null,
  });
}

export async function deleteCourse(id) {
  return apiDelete(`/academics/courses/${id}`);
}
