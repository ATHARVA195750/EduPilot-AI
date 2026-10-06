/**
 * studentService.js — FastAPI backend edition.
 * All Supabase calls replaced with FastAPI /api/v1/students/* endpoints.
 * normalizeStudent preserved for UI compatibility.
 */
import { apiGet, apiPost, apiPut } from '../lib/apiClient';

function normalizeStudent(item) {
  if (!item) return null;
  return {
    ...item,
    full_name: item.full_name || item.name || item.student_name || 'Student',
    standard: item.standard || item.class || item.grade || 'Class 10th',
    parent_phone: item.parent_phone || item.phone || item.contact || '',
    status: item.status || 'Active',
    course_name: item.course_name || item.courses?.name || 'General Course',
    batch_name: item.batch_name || item.batches?.name || 'Unassigned Batch',
  };
}

export async function fetchStudents(instituteId, filters = {}) {
  const params = {};
  if (filters.batch_id) params.batch_id = filters.batch_id;
  if (filters.course_id) params.course_id = filters.course_id;
  const data = await apiGet('/students', params);
  return (data || []).map(normalizeStudent);
}

export async function fetchStudentByUserId(userId) {
  if (!userId) return null;
  try {
    const student = await apiGet('/students/me');
    return student ? normalizeStudent(student) : null;
  } catch {
    return null;
  }
}

export async function fetchStudent(id) {
  if (!id) return null;
  const data = await apiGet(`/students/${id}`);
  return data ? normalizeStudent(data) : null;
}

export async function createStudent(studentData, instituteId) {
  const payload = {
    full_name: studentData.full_name,
    email: studentData.email || null,
    phone: studentData.parent_phone || studentData.phone || null,
    gender: studentData.gender || null,
    dob: studentData.dob || null,
    school_name: studentData.school_name || null,
    standard: studentData.standard || null,
    board: studentData.board || null,
    course_id: studentData.course_id || null,
    batch_id: studentData.batch_id || null,
    parent_name: studentData.parent_name || null,
    parent_phone: studentData.parent_phone || null,
    parent_email: studentData.parent_email || null,
  };
  const result = await apiPost('/students', payload);
  const normalized = normalizeStudent(result);
  if (result?.temp_password) {
    normalized._credentials = {
      identifier: result.student_id_code,
      tempPassword: result.temp_password,
    };
  }
  return normalized;
}

export async function createStudentRecord(studentData, instituteId) {
  return createStudent(studentData, instituteId);
}

export async function updateStudent(id, studentData) {
  const payload = {
    full_name: studentData.full_name,
    standard: studentData.standard || null,
    course_id: studentData.course_id || null,
    batch_id: studentData.batch_id || null,
    gender: studentData.gender || null,
    dob: studentData.dob || null,
    school_name: studentData.school_name || null,
    parent_name: studentData.parent_name || null,
    parent_phone: studentData.parent_phone || null,
    parent_email: studentData.parent_email || null,
    status: studentData.status || 'Active',
  };
  const result = await apiPut(`/students/${id}`, payload);
  return normalizeStudent(result);
}

export async function deleteStudent(id) {
  // Soft delete via status update
  return apiPut(`/students/${id}`, { status: 'Inactive' });
}

export async function findStudentsForAdmission(instituteId) {
  return fetchStudents(instituteId);
}

// Stub: provisioning now handled server-side via createStudent
export async function provisionStudentAccount(studentId, fullName, phone) {
  throw new Error('provisionStudentAccount is handled server-side. Use createStudent instead.');
}
