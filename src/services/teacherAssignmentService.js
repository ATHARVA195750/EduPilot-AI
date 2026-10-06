/**
 * teacherAssignmentService.js — FastAPI backend edition.
 */
import { apiGet, apiPost } from '../lib/apiClient';

export async function fetchTeacherAssignments(teacherId) {
  const url = teacherId ? `/teachers/assignments?teacher_id=${teacherId}` : '/teachers/assignments';
  const data = await apiGet(url);
  return data || [];
}

export async function fetchAssignmentsForInstitute(instituteId) {
  const data = await apiGet('/teachers/assignments');
  return data || [];
}

export async function createTeacherAssignment(assignmentData, instituteId) {
  return apiPost(`/teachers/assignments?teacher_id=${assignmentData.teacher_id}&batch_id=${assignmentData.batch_id}&subject_id=${assignmentData.subject_id || ''}`);
}

export async function updateTeacherAssignmentStatus(id, status) {
  return { id, status };
}

export async function deleteTeacherAssignment(id) {
  return { id };
}

export async function validateTeacherAssignment(teacherId, batchId, subjectId) {
  const assignments = await fetchTeacherAssignments(teacherId);
  return assignments.some((a) => a.batch_id === batchId && (!subjectId || a.subject_id === subjectId));
}
