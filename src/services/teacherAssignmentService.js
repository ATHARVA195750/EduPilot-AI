import { supabase } from '../lib/supabase';

export async function fetchTeacherAssignments(teacherId) {
  if (!supabase) return [];
  try {
    let query = supabase
      .from('teacher_assignments')
      .select('*, batches(id, name, room_number, courses(name)), subjects(id, name, code)')
      .order('created_at', { ascending: false });

    if (teacherId) {
      query = query.eq('teacher_id', teacherId);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error('Error in fetchTeacherAssignments:', err);
    return [];
  }
}

export async function fetchAssignmentsForInstitute(instituteId) {
  if (!supabase) return [];
  try {
    let query = supabase
      .from('teacher_assignments')
      .select('*, teachers(id, full_name), batches(id, name, room_number), subjects(id, name, code)')
      .order('created_at', { ascending: false });

    if (instituteId) {
      query = query.eq('institute_id', instituteId);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error('Error in fetchAssignmentsForInstitute:', err);
    return [];
  }
}

export async function createTeacherAssignment(assignmentData, instituteId) {
  if (!supabase) throw new Error('Database client uninitialized');

  // Duplicate assignment check for active assignment with same teacher_id + batch_id + subject_id
  const { data: existing } = await supabase
    .from('teacher_assignments')
    .select('id')
    .eq('teacher_id', assignmentData.teacher_id)
    .eq('batch_id', assignmentData.batch_id)
    .eq('subject_id', assignmentData.subject_id)
    .eq('status', 'Active')
    .maybeSingle();

  if (existing) {
    throw new Error('This active teacher assignment for the selected batch and subject already exists.');
  }

  const payload = {
    institute_id: instituteId,
    teacher_id: assignmentData.teacher_id,
    batch_id: assignmentData.batch_id,
    subject_id: assignmentData.subject_id,
    status: assignmentData.status || 'Active',
  };

  const { data, error } = await supabase.from('teacher_assignments').insert(payload).select().single();
  if (error) throw error;
  return data;
}

export async function updateTeacherAssignmentStatus(id, status) {
  if (!supabase) throw new Error('Database client uninitialized');
  const { data, error } = await supabase
    .from('teacher_assignments')
    .update({ status })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function validateTeacherAssignment(teacherId, batchId, subjectId) {
  if (!supabase || !teacherId || !batchId || !subjectId) return true;
  try {
    const { data } = await supabase
      .from('teacher_assignments')
      .select('id')
      .eq('teacher_id', teacherId)
      .eq('batch_id', batchId)
      .eq('subject_id', subjectId)
      .maybeSingle();

    return Boolean(data);
  } catch (err) {
    console.warn('validateTeacherAssignment error:', err);
    return true;
  }
}

