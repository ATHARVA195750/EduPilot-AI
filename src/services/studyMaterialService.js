import { supabase } from '../lib/supabase';

/**
 * Fetch all study materials filtered by institute, batch, subject, or material_type.
 */
export async function fetchStudyMaterials(filters = {}) {
  if (!supabase) return [];

  let query = supabase
    .from('study_materials')
    .select('*, teachers(id, full_name), batches(id, name), subjects(id, name)')
    .order('created_at', { ascending: false });

  if (filters.batch_id) {
    query = query.eq('batch_id', filters.batch_id);
  }
  if (filters.subject_id) {
    query = query.eq('subject_id', filters.subject_id);
  }
  if (filters.material_type) {
    query = query.eq('material_type', filters.material_type);
  }
  if (filters.is_published !== undefined) {
    query = query.eq('is_published', filters.is_published);
  }

  const { data, error } = await query;
  if (error) {
    console.warn('fetchStudyMaterials error:', error);
    return [];
  }
  return data || [];
}

/**
 * Fetch published study materials for student enrolled batch / standard.
 */
export async function fetchStudentStudyMaterials({ batch_id, standard }) {
  if (!supabase) return [];

  let query = supabase
    .from('study_materials')
    .select('*, teachers(id, full_name), subjects(id, name)')
    .eq('is_published', true)
    .order('created_at', { ascending: false });

  if (batch_id) {
    query = query.eq('batch_id', batch_id);
  } else if (standard) {
    query = query.eq('standard', standard);
  }

  const { data, error } = await query;
  if (error) {
    console.warn('fetchStudentStudyMaterials error:', error);
    return [];
  }
  return data || [];
}

/**
 * Create new study material record.
 */
export async function createStudyMaterial(payload) {
  if (!supabase) throw new Error('Supabase client is unavailable.');

  const cleanPayload = {
    title: payload.title,
    description: payload.description || null,
    chapter: payload.chapter || null,
    subject: payload.subject || null,
    course_name: payload.course_name || payload.standard || null,
    batch_name: payload.batch_name || null,
    batch_id: payload.batch_id || null,
    subject_id: payload.subject_id || null,
    teacher_id: payload.teacher_id || null,
    institute_id: payload.institute_id || null,
    material_type: payload.material_type || 'PDF',
    file_url: payload.file_url || null,
    external_url: payload.external_url || null,
    uploaded_by: payload.uploaded_by || 'Faculty Instructor',
    is_published: payload.is_published !== undefined ? payload.is_published : true,
  };

  const { data, error } = await supabase
    .from('study_materials')
    .insert([cleanPayload])
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Update existing study material.
 */
export async function updateStudyMaterial(id, updates) {
  if (!supabase || !id) throw new Error('Supabase client or study material ID missing.');

  const { data, error } = await supabase
    .from('study_materials')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Toggle publish state for study material.
 */
export async function togglePublishStudyMaterial(id, is_published) {
  return updateStudyMaterial(id, { is_published });
}

/**
 * Delete study material record.
 */
export async function deleteStudyMaterial(id) {
  if (!supabase || !id) throw new Error('Supabase client or study material ID missing.');

  const { data, error } = await supabase
    .from('study_materials')
    .delete()
    .eq('id', id)
    .select();

  if (error) throw error;
  return data;
}
