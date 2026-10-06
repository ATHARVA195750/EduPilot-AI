/**
 * attendanceService.js — FastAPI backend edition.
 * Replaces Supabase upsert with FastAPI /api/v1/attendance/bulk endpoint.
 */
import { apiGet, apiPost } from '../lib/apiClient';

export async function fetchAttendance(filters = {}) {
  try {
    const params = {};
    if (filters.batch_id) params.batch_id = filters.batch_id;
    if (filters.student_id) params.student_id = filters.student_id;
    if (filters.attendance_date) params.attendance_date = filters.attendance_date;
    const data = await apiGet('/attendance', params);
    return data || [];
  } catch (err) {
    console.warn('fetchAttendance error:', err.message);
    return [];
  }
}

export async function fetchAttendanceBySession(classSessionId) {
  if (!classSessionId) return [];
  return fetchAttendance({ class_session_id: classSessionId });
}

export async function fetchBatchStudentsForAttendance(batchId) {
  if (!batchId) return [];
  try {
    const data = await apiGet('/students', { batch_id: batchId });
    return data || [];
  } catch (err) {
    console.warn('fetchBatchStudentsForAttendance error:', err.message);
    return [];
  }
}

export async function saveSessionAttendance({ class_session_id, batch_id, subject_id, session_date, records, institute_id }) {
  if (!records || !Array.isArray(records) || records.length === 0) return [];

  const payload = {
    batch_id: batch_id || null,
    attendance_date: session_date || new Date().toISOString().slice(0, 10),
    records: records.map((r) => {
      const studentId = typeof r === 'string' ? r : (r.student_id || r.id);
      return {
        student_id: studentId,
        batch_id: batch_id || r.batch_id || null,
        subject_id: subject_id || r.subject_id || null,
        attendance_date: session_date || r.attendance_date || new Date().toISOString().slice(0, 10),
        status: r.status || 'present',
        remarks: r.remarks || null,
      };
    }),
  };

  const result = await apiPost('/attendance/bulk', payload);
  return result || [];
}

export async function markAttendance(firstArg, date, status, sessionId = null) {
  if (Array.isArray(firstArg)) {
    return saveSessionAttendance({
      class_session_id: sessionId,
      session_date: date,
      records: firstArg,
    });
  }
  return saveSessionAttendance({
    class_session_id: sessionId,
    session_date: date,
    records: [{ student_id: firstArg, status, attendance_date: date }],
  });
}

export const saveAttendance = markAttendance;
