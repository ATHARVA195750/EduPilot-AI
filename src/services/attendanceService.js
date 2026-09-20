import { supabase } from '../lib/supabase';

/**
 * Fetch attendance records filtered by session, batch, student, or date.
 */
export async function fetchAttendance(filters = {}) {
  if (!supabase) return [];
  try {
    let query = supabase
      .from('attendance')
      .select('*, students(id, full_name, parent_phone, standard, batch_id), class_sessions(id, session_date, start_time, end_time, topic, status)')
      .order('attendance_date', { ascending: false });

    if (filters.class_session_id) {
      query = query.eq('class_session_id', filters.class_session_id);
    }
    if (filters.batch_id) {
      query = query.eq('batch_id', filters.batch_id);
    }
    if (filters.student_id) {
      query = query.eq('student_id', filters.student_id);
    }
    if (filters.attendance_date) {
      query = query.eq('attendance_date', filters.attendance_date);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  } catch (err) {
    console.warn('fetchAttendance error:', err);
    return [];
  }
}

/**
 * Fetch attendance records for a specific class session ID.
 */
export async function fetchAttendanceBySession(classSessionId) {
  if (!supabase || !classSessionId) return [];
  try {
    const { data, error } = await supabase
      .from('attendance')
      .select('*')
      .eq('class_session_id', classSessionId);

    if (error) throw error;
    return data || [];
  } catch (err) {
    console.warn('fetchAttendanceBySession error:', err);
    return [];
  }
}

/**
 * Fetch active students in a batch for taking attendance.
 */
export async function fetchBatchStudentsForAttendance(batchId, instituteId) {
  if (!supabase || !batchId) return [];
  try {
    // 1. Try querying students directly by batch_id
    const { data: directStudents, error: directErr } = await supabase
      .from('students')
      .select('*')
      .eq('batch_id', batchId)
      .order('full_name', { ascending: true });

    if (!directErr && directStudents && directStudents.length > 0) {
      return directStudents;
    }

    // 2. Try active enrollments table linkage
    const { data: enrollments, error: enrollErr } = await supabase
      .from('enrollments')
      .select('student_id, students(*)')
      .eq('batch_id', batchId);

    if (!enrollErr && enrollments && enrollments.length > 0) {
      return enrollments.map((e) => e.students).filter(Boolean);
    }

    // 3. Fallback to querying all students in the institute if specific batch has no assigned students yet
    const { data: allStudents } = await supabase
      .from('students')
      .select('*')
      .order('full_name', { ascending: true });

    return allStudents || [];
  } catch (err) {
    console.warn('fetchBatchStudentsForAttendance error:', err);
    return [];
  }
}

/**
 * Bulk save or update attendance for a class session.
 * Prevents duplicate rows using live UNIQUE(student_id, attendance_date) constraint.
 */
export async function saveSessionAttendance({ class_session_id, batch_id, subject_id, session_date, records, institute_id }) {
  if (!records || !Array.isArray(records) || records.length === 0) return [];

  const payload = records.map((r) => {
    const studentId = typeof r === 'string' ? r : (r.student_id || r.id);
    return {
      student_id: studentId,
      class_session_id: class_session_id || r.class_session_id || null,
      batch_id: batch_id || r.batch_id || null,
      subject_id: subject_id || r.subject_id || null,
      attendance_date: session_date || r.attendance_date || new Date().toISOString().slice(0, 10),
      status: r.status || 'present',
      remarks: r.remarks || null,
    };
  });

  if (typeof console !== 'undefined' && console.log) {
    console.log('[saveSessionAttendance] Payload BEFORE Supabase upsert:', payload);
  }

  if (!supabase) return [];

  try {
    const { data, error } = await supabase
      .from('attendance')
      .upsert(payload, { onConflict: 'student_id,attendance_date' })
      .select();

    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error('saveSessionAttendance error:', err);
    throw err;
  }
}

/**
 * Flexibility wrapper handling single student or records array.
 */
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

// Alias for backward compatibility
export const saveAttendance = markAttendance;
