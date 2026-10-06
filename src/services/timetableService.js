/**
 * timetableService.js — FastAPI backend edition.
 */
import { apiGet, apiPost, apiPut, apiDelete } from '../lib/apiClient';
import { checkScheduleConflicts } from '../utils/scheduleConflicts';

export { checkScheduleConflicts };

export const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export function dayOfWeekFromDate(dateStr) {
  if (!dateStr) return null;
  const parsed = new Date(`${String(dateStr).slice(0, 10)}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return null;
  return DAYS[(parsed.getDay() + 6) % 7];
}

export async function validateTeacherAssignment(teacherId, batchId, subjectId) {
  return true;
}

export async function fetchSchedules(instituteId) {
  const data = await apiGet('/academics/schedules');
  return (data || []).map((s) => ({
    id: s.id,
    batch_id: s.batch_id,
    teacher_id: s.teacher_id,
    subject_id: s.subject_id,
    room_number: s.room_number || 'Room 101',
    day_of_week: s.day_of_week || 'Monday',
    start_time: s.start_time ? String(s.start_time).slice(0, 5) : '18:00',
    end_time: s.end_time ? String(s.end_time).slice(0, 5) : '19:30',
  }));
}

export async function fetchStudentSchedules(instituteId, batchId) {
  const data = await apiGet(`/academics/schedules?batch_id=${batchId}`);
  return data || [];
}

export async function createSchedule(scheduleData, instituteId) {
  const payload = {
    batch_id: scheduleData.batch_id,
    subject_id: scheduleData.subject_id || null,
    teacher_id: scheduleData.teacher_id || null,
    day_of_week: scheduleData.day_of_week || 'Monday',
    start_time: scheduleData.start_time || '18:00',
    end_time: scheduleData.end_time || '19:30',
    room_number: scheduleData.room_number || 'Room 101',
  };
  return apiPost('/academics/schedules', payload);
}

export async function updateClassSession(id, scheduleData, instituteId) {
  const payload = {
    batch_id: scheduleData.batch_id,
    subject_id: scheduleData.subject_id || null,
    teacher_id: scheduleData.teacher_id || null,
    day_of_week: scheduleData.day_of_week || 'Monday',
    start_time: scheduleData.start_time || '18:00',
    end_time: scheduleData.end_time || '19:30',
    room_number: scheduleData.room_number || 'Room 101',
  };
  return apiPut(`/academics/schedules/${id}`, payload);
}

export async function cancelClassSession(id) {
  return apiPut(`/academics/schedules/${id}`, { status: 'cancelled' });
}

export async function checkSessionDependencies(id, batchId, sessionDate) {
  return false;
}

export async function deleteClassSession(id) {
  return apiDelete(`/academics/schedules/${id}`);
}
