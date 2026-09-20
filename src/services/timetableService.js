import { supabase } from '../lib/supabase';

export const DEMO_SCHEDULES = [
  {
    id: 'sch_1',
    batch_id: 'b1',
    batch_name: 'Class 10th - Batch A',
    subject_id: 'sub_1',
    subject: 'Physics',
    teacher_id: 't1',
    teacher_name: 'Dr. Rajesh Kumar',
    room_number: 'Room 101',
    day_of_week: 'Monday',
    start_time: '18:00',
    end_time: '19:30',
    session_date: '2026-09-21',
    status: 'scheduled',
    topic: 'Laws of Motion',
    notes: 'Bring lab manuals',
  },
  {
    id: 'sch_2',
    batch_id: 'b1',
    batch_name: 'Class 10th - Batch A',
    subject_id: 'sub_2',
    subject: 'Mathematics',
    teacher_id: 't2',
    teacher_name: 'Sunita Gupta',
    room_number: 'Room 101',
    day_of_week: 'Wednesday',
    start_time: '18:00',
    end_time: '19:30',
    session_date: '2026-09-23',
    status: 'scheduled',
    topic: 'Quadratic Equations',
    notes: '',
  },
  {
    id: 'sch_3',
    batch_id: 'b2',
    batch_name: 'Class 12th - Batch B',
    subject_id: 'sub_3',
    subject: 'Chemistry',
    teacher_id: 't2',
    teacher_name: 'Sunita Gupta',
    room_number: 'Lab 2',
    day_of_week: 'Tuesday',
    start_time: '17:00',
    end_time: '18:30',
    session_date: '2026-09-22',
    status: 'scheduled',
    topic: 'Organic Reaction Mechanisms',
    notes: '',
  }
];

/**
 * Check whether a schedule slot conflicts with existing schedules.
 * Excludes currentSessionId so an existing session being edited does not conflict with itself.
 */
export function checkScheduleConflicts(existingSchedules, newSlot, currentSessionId = null) {
  const conflicts = [];
  const newStart = newSlot.start_time;
  const newEnd = newSlot.end_time;

  for (const s of existingSchedules) {
    // Exclude cancelled sessions and current session being edited
    if (s.status === 'cancelled') continue;
    if (currentSessionId && String(s.id) === String(currentSessionId)) continue;
    if (newSlot.id && String(s.id) === String(newSlot.id)) continue;

    // Day of week match
    if (s.day_of_week && newSlot.day_of_week && s.day_of_week.toLowerCase() !== newSlot.day_of_week.toLowerCase()) continue;

    // Time overlap check (start1 < end2 && end1 > start2)
    const isOverlapping = (newStart < s.end_time && newEnd > s.start_time);

    if (isOverlapping) {
      if (s.teacher_id && newSlot.teacher_id && String(s.teacher_id) === String(newSlot.teacher_id)) {
        conflicts.push(`Teacher Conflict: ${s.teacher_name || 'Selected Faculty'} is already scheduled for ${s.batch_name || 'another batch'} at ${s.start_time}-${s.end_time}.`);
      }
      if (s.room_number && newSlot.room_number && s.room_number.toLowerCase() === newSlot.room_number.toLowerCase()) {
        conflicts.push(`Room Conflict: ${s.room_number} is already occupied by ${s.batch_name || 'another class'} at ${s.start_time}-${s.end_time}.`);
      }
      if (s.batch_id && newSlot.batch_id && String(s.batch_id) === String(newSlot.batch_id)) {
        conflicts.push(`Batch Conflict: ${s.batch_name || 'This batch'} already has a class scheduled (${s.subject || 'Subject'}) at ${s.start_time}-${s.end_time}.`);
      }
    }
  }

  return conflicts;
}

/**
 * Verify teacher assignment validity in teacher_assignments table.
 */
export async function validateTeacherAssignment(teacherId, batchId, subjectId) {
  if (!supabase || !teacherId || !batchId) return true; // fallback if uninitialized/unspecified
  try {
    let query = supabase
      .from('teacher_assignments')
      .select('id')
      .eq('teacher_id', teacherId)
      .eq('batch_id', batchId)
      .eq('status', 'Active');

    if (subjectId) {
      query = query.eq('subject_id', subjectId);
    }

    const { data, error } = await query;
    if (error) throw error;
    return Boolean(data && data.length > 0);
  } catch (err) {
    console.warn('Teacher assignment validation warning:', err);
    return true; // allow proceeding if offline or unmapped schema
  }
}

/**
 * Fetch class sessions from live Supabase class_sessions table
 */
export async function fetchSchedules(instituteId) {
  if (!supabase) return DEMO_SCHEDULES;
  try {
    let query = supabase
      .from('class_sessions')
      .select('*, batches(id, name), teachers(id, full_name), subjects(id, name), branches(id, name)')
      .order('created_at', { ascending: false });

    if (instituteId) {
      query = query.eq('institute_id', instituteId);
    }

    const { data, error } = await query;
    if (error) throw error;

    if (!data || data.length === 0) {
      return [];
    }

    return data.map(s => ({
      id: s.id,
      institute_id: s.institute_id,
      branch_id: s.branch_id,
      branch_name: s.branches?.name || s.branch_name || 'Main Campus',
      batch_id: s.batch_id,
      batch_name: s.batches?.name || s.batch_name || 'Class 10th - Batch A',
      teacher_id: s.teacher_id,
      teacher_name: s.teachers?.full_name || s.teacher_name || 'Assigned Instructor',
      subject_id: s.subject_id,
      subject: s.subjects?.name || s.subject || 'Subject',
      room_number: s.room || s.room_number || 'Room 101',
      day_of_week: s.day_of_week || 'Monday',
      session_date: s.session_date || s.date || new Date().toISOString().slice(0, 10),
      start_time: s.start_time ? String(s.start_time).slice(0, 5) : '18:00',
      end_time: s.end_time ? String(s.end_time).slice(0, 5) : '19:30',
      topic: s.topic || '',
      status: s.status || 'scheduled',
      notes: s.notes || '',
      created_at: s.created_at
    }));
  } catch (err) {
    console.error('fetchSchedules error:', err);
    return [];
  }
}

export async function fetchStudentSchedules(instituteId, batchId) {
  if (!supabase || !instituteId || !batchId) return [];
  try {
    const { data, error } = await supabase
      .from('class_sessions')
      .select('*, batches(id, name), teachers(id, full_name), subjects(id, name), branches(id, name)')
      .eq('institute_id', instituteId)
      .eq('batch_id', batchId)
      .order('session_date', { ascending: true });
    if (error) throw error;

    return (data || []).map(s => ({
      id: s.id,
      institute_id: s.institute_id,
      branch_id: s.branch_id,
      branch_name: s.branches?.name || s.branch_name || 'Main Campus',
      batch_id: s.batch_id,
      batch_name: s.batches?.name || s.batch_name || 'Class Batch',
      teacher_id: s.teacher_id,
      teacher_name: s.teachers?.full_name || s.teacher_name || 'Assigned Instructor',
      subject_id: s.subject_id,
      subject: s.subjects?.name || s.subject || 'Subject',
      room_number: s.room || s.room_number || 'Room TBA',
      day_of_week: s.day_of_week || 'Monday',
      session_date: s.session_date || s.date,
      start_time: s.start_time ? String(s.start_time).slice(0, 5) : '—',
      end_time: s.end_time ? String(s.end_time).slice(0, 5) : '—',
      topic: s.topic || '',
      status: s.status || 'scheduled',
      notes: s.notes || '',
      created_at: s.created_at,
    }));
  } catch (err) {
    console.warn('fetchStudentSchedules error:', err);
    return [];
  }
}

/**
 * Create a new class session record in class_sessions table
 */
export async function createSchedule(scheduleData, instituteId) {
  const payload = {
    institute_id: instituteId,
    branch_id: scheduleData.branch_id || null,
    batch_id: scheduleData.batch_id || null,
    teacher_id: scheduleData.teacher_id || null,
    subject_id: scheduleData.subject_id || null,
    day_of_week: scheduleData.day_of_week || 'Monday',
    session_date: scheduleData.session_date || new Date().toISOString().slice(0, 10),
    start_time: scheduleData.start_time,
    end_time: scheduleData.end_time,
    room: scheduleData.room_number || scheduleData.room || 'Room 101',
    topic: scheduleData.topic || null,
    status: scheduleData.status || 'scheduled',
    notes: scheduleData.notes || null,
  };

  const localSchedule = {
    id: 'sch_' + Date.now(),
    batch_name: scheduleData.batch_name || 'Class Batch',
    subject: scheduleData.subject || 'Subject',
    teacher_name: scheduleData.teacher_name || 'Faculty',
    room_number: payload.room,
    ...payload
  };

  DEMO_SCHEDULES.unshift(localSchedule);

  if (!supabase) return localSchedule;
  try {
    const { data, error } = await supabase
      .from('class_sessions')
      .insert(payload)
      .select('*, batches(id, name), teachers(id, full_name), subjects(id, name), branches(id, name)')
      .single();

    if (error) throw error;

    return {
      id: data.id,
      institute_id: data.institute_id,
      branch_id: data.branch_id,
      branch_name: data.branches?.name || scheduleData.branch_name || 'Main Campus',
      batch_id: data.batch_id,
      batch_name: data.batches?.name || scheduleData.batch_name || 'Class Batch',
      teacher_id: data.teacher_id,
      teacher_name: data.teachers?.full_name || data.teachers?.name || scheduleData.teacher_name || 'Assigned Instructor',
      subject_id: data.subject_id,
      subject: data.subjects?.name || scheduleData.subject || 'Subject',
      room_number: data.room || payload.room,
      day_of_week: data.day_of_week || payload.day_of_week,
      session_date: data.session_date || payload.session_date,
      start_time: String(data.start_time).slice(0, 5),
      end_time: String(data.end_time).slice(0, 5),
      topic: data.topic || '',
      status: data.status || 'scheduled',
      notes: data.notes || '',
      created_at: data.created_at
    };
  } catch (err) {
    console.error('Error creating class session in Supabase:', err);
    return localSchedule;
  }
}

/**
 * Update an existing class session record in class_sessions table
 */
export async function updateClassSession(id, scheduleData, instituteId) {
  const payload = {
    branch_id: scheduleData.branch_id || null,
    batch_id: scheduleData.batch_id || null,
    teacher_id: scheduleData.teacher_id || null,
    subject_id: scheduleData.subject_id || null,
    day_of_week: scheduleData.day_of_week || 'Monday',
    session_date: scheduleData.session_date || new Date().toISOString().slice(0, 10),
    start_time: scheduleData.start_time,
    end_time: scheduleData.end_time,
    room: scheduleData.room_number || scheduleData.room || 'Room 101',
    topic: scheduleData.topic || null,
    status: scheduleData.status || 'scheduled',
    notes: scheduleData.notes || null,
  };

  const idx = DEMO_SCHEDULES.findIndex(s => String(s.id) === String(id));
  if (idx !== -1) {
    DEMO_SCHEDULES[idx] = { ...DEMO_SCHEDULES[idx], ...payload, ...scheduleData };
  }

  if (!supabase) return { id, ...scheduleData };
  try {
    const { data, error } = await supabase
      .from('class_sessions')
      .update(payload)
      .eq('id', id)
      .select('*, batches(id, name), teachers(id, full_name), subjects(id, name), branches(id, name)')
      .single();

    if (error) throw error;

    return {
      id: data.id,
      institute_id: data.institute_id,
      branch_id: data.branch_id,
      branch_name: data.branches?.name || scheduleData.branch_name || 'Main Campus',
      batch_id: data.batch_id,
      batch_name: data.batches?.name || scheduleData.batch_name || 'Class Batch',
      teacher_id: data.teacher_id,
      teacher_name: data.teachers?.full_name || data.teachers?.name || scheduleData.teacher_name || 'Assigned Instructor',
      subject_id: data.subject_id,
      subject: data.subjects?.name || scheduleData.subject || 'Subject',
      room_number: data.room || payload.room,
      day_of_week: data.day_of_week || payload.day_of_week,
      session_date: data.session_date || payload.session_date,
      start_time: String(data.start_time).slice(0, 5),
      end_time: String(data.end_time).slice(0, 5),
      topic: data.topic || '',
      status: data.status || 'scheduled',
      notes: data.notes || '',
      created_at: data.created_at
    };
  } catch (err) {
    console.error('Error updating class session in Supabase:', err);
    throw err;
  }
}

/**
 * Cancel a class session (sets status = 'cancelled')
 */
export async function cancelClassSession(id) {
  const idx = DEMO_SCHEDULES.findIndex(s => String(s.id) === String(id));
  if (idx !== -1) {
    DEMO_SCHEDULES[idx].status = 'cancelled';
  }

  if (!supabase) return { id, status: 'cancelled' };
  try {
    const { data, error } = await supabase
      .from('class_sessions')
      .update({ status: 'cancelled' })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (err) {
    console.error('Error cancelling class session in Supabase:', err);
    throw err;
  }
}

/**
 * Check if a class session has dependent academic records (e.g. attendance records).
 */
export async function checkSessionDependencies(id, batchId, sessionDate) {
  if (!supabase) return false;
  try {
    let query = supabase.from('attendance').select('id').limit(1);
    if (id) {
      // Check if attendance links to class_session_id or batch_id + date
      query = query.or(`class_session_id.eq.${id},and(batch_id.eq.${batchId},attendance_date.eq.${sessionDate})`);
    } else if (batchId && sessionDate) {
      query = query.eq('batch_id', batchId).eq('attendance_date', sessionDate);
    }
    const { data, error } = await query;
    if (error) return false;
    return Boolean(data && data.length > 0);
  } catch (err) {
    return false;
  }
}

/**
 * Delete a class session permanently. If dependent records exist, throws error instructing cancellation.
 */
export async function deleteClassSession(id, batchId = null, sessionDate = null) {
  const hasDependencies = await checkSessionDependencies(id, batchId, sessionDate);
  if (hasDependencies) {
    throw new Error('DEPENDENT_RECORDS_EXIST');
  }

  const idx = DEMO_SCHEDULES.findIndex(s => String(s.id) === String(id));
  if (idx !== -1) {
    DEMO_SCHEDULES.splice(idx, 1);
  }

  if (!supabase) return { id, deleted: true };
  try {
    const { error } = await supabase
      .from('class_sessions')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return { id, deleted: true };
  } catch (err) {
    console.error('Error deleting class session in Supabase:', err);
    throw err;
  }
}

