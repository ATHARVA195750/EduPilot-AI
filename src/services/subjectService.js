import { supabase } from '../lib/supabase';

export async function fetchSubjects(courseId) {
  if (!supabase) return [];
  try {
    let query = supabase.from('subjects').select('*').order('name', { ascending: true });
    if (courseId) {
      query = query.eq('course_id', courseId);
    }
    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error('Error in fetchSubjects:', err);
    return [];
  }
}

export async function createSubject(subjectData, instituteId) {
  if (!supabase) throw new Error('Database client uninitialized');
  const payload = {
    course_id: subjectData.course_id,
    name: subjectData.name,
    code: subjectData.code || null,
    description: subjectData.description || null,
    institute_id: instituteId || subjectData.institute_id || null,
  };

  const { data, error } = await supabase.from('subjects').insert(payload).select().single();
  if (error) throw error;
  return data;
}

export async function deleteSubject(id) {
  if (!supabase) throw new Error('Database client uninitialized');
  const { error } = await supabase.from('subjects').delete().eq('id', id);
  if (error) throw error;
}
