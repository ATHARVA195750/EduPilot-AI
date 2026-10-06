/**
 * teacherService.js — FastAPI backend edition.
 * All Supabase calls replaced with FastAPI /api/v1/teachers/* endpoints.
 */
import { apiGet, apiPost, apiPut } from '../lib/apiClient';

function normalizeTeacher(t) {
  if (!t) return null;
  return {
    ...t,
    full_name: t.full_name || t.name || 'Faculty Member',
    email: t.email || '',
    phone: t.phone || '',
    subject: t.specialization || t.subject || 'General Subject',
    specialization: t.specialization || t.subject || 'General Subject',
    qualification: t.qualification || 'Higher Education Degree',
    salary: t.salary ?? t.base_salary ?? null,
    status: t.status || 'Active',
  };
}

export async function fetchTeachers(instituteId) {
  const data = await apiGet('/teachers');
  return (data || []).map(normalizeTeacher);
}

export async function fetchTeacher(id) {
  if (!id) return null;
  const data = await apiGet(`/teachers/${id}`);
  return data ? normalizeTeacher(data) : null;
}

export async function createTeacher(value, instituteId) {
  const payload = {
    name: value.full_name || value.name,
    email: value.email || null,
    phone: value.phone || null,
    qualification: value.qualification || null,
    specialization: value.specialization || value.subject || null,
    base_salary: value.salary ? Number(value.salary) : null,
    joining_date: value.joining_date || new Date().toISOString().slice(0, 10),
  };
  const result = await apiPost('/teachers', payload);
  const normalized = normalizeTeacher(result);
  if (result?.temp_password) {
    normalized._credentials = {
      identifier: result.teacher_id_code,
      tempPassword: result.temp_password,
    };
  }
  return normalized;
}

export async function updateTeacher(id, value) {
  const payload = {
    name: value.full_name || value.name,
    email: value.email || null,
    phone: value.phone || null,
    qualification: value.qualification || null,
    specialization: value.specialization || value.subject || null,
    base_salary: value.salary ? Number(value.salary) : null,
    joining_date: value.joining_date || undefined,
    status: value.status || 'Active',
  };
  Object.keys(payload).forEach((k) => payload[k] === undefined && delete payload[k]);
  const result = await apiPut(`/teachers/${id}`, payload);
  return normalizeTeacher(result);
}

export async function deleteTeacher(id) {
  return apiPut(`/teachers/${id}`, { status: 'Inactive' });
}

// Stub
export async function provisionTeacherAccount() {
  throw new Error('provisionTeacherAccount is handled server-side. Use createTeacher instead.');
}
