import { supabase } from '../lib/supabase';

/**
 * Fetch all homework records filtered by institute, batch, or subject.
 */
export async function fetchHomework(filters = {}) {
  if (!supabase) return [];

  let query = supabase
    .from('homework')
    .select('*, teachers(id, full_name), batches(id, name), subjects(id, name)')
    .order('due_date', { ascending: false });

  if (filters.batch_id) {
    query = query.eq('batch_id', filters.batch_id);
  }
  if (filters.subject_id) {
    query = query.eq('subject_id', filters.subject_id);
  }
  if (filters.standard) {
    query = query.eq('standard', filters.standard);
  }
  if (filters.teacher_id) {
    query = query.eq('teacher_id', filters.teacher_id);
  }

  const { data, error } = await query;
  if (error) {
    console.warn('fetchHomework error:', error);
    return [];
  }
  return data || [];
}

/**
 * Fetch homework specifically for student enrolled batch / standard.
 */
export async function fetchStudentHomework({ batch_id, standard }) {
  if (!supabase) return [];

  let query = supabase
    .from('homework')
    .select('*, teachers(id, full_name), subjects(id, name)')
    .order('due_date', { ascending: true });

  if (batch_id) {
    query = query.eq('batch_id', batch_id);
  } else if (standard) {
    query = query.eq('standard', standard);
  }

  const { data, error } = await query;
  if (error) {
    console.warn('fetchStudentHomework error:', error);
    return [];
  }
  return data || [];
}

/**
 * Create new homework record.
 */
export async function createHomework(payload) {
  if (!supabase) throw new Error('Supabase client is unavailable.');

  const cleanPayload = {
    title: payload.title,
    description: payload.description || payload.subject || null,
    standard: payload.standard || payload.className || null,
    batch_id: payload.batch_id || null,
    subject_id: payload.subject_id || null,
    teacher_id: payload.teacher_id || null,
    institute_id: payload.institute_id || null,
    due_date: payload.due_date || new Date(Date.now() + 86400000 * 3).toISOString().slice(0, 10),
    file_url: payload.file_url || null,
  };

  const { data, error } = await supabase
    .from('homework')
    .insert([cleanPayload])
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Update existing homework record.
 */
export async function updateHomework(id, updates) {
  if (!supabase || !id) throw new Error('Supabase client or homework ID missing.');

  const { data, error } = await supabase
    .from('homework')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Delete homework record.
 */
export async function deleteHomework(id) {
  if (!supabase || !id) throw new Error('Supabase client or homework ID missing.');

  const { data, error } = await supabase
    .from('homework')
    .delete()
    .eq('id', id)
    .select();

  if (error) throw error;
  return data;
}