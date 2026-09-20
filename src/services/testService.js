import { supabase } from '../lib/supabase';

export async function fetchTests(instituteId) {
  if (!supabase || !instituteId) return [];
  try {
    const { data, error } = await supabase
      .from('tests')
      .select('*, batches(id, name), subjects(id, name)')
      .eq('institute_id', instituteId)
      .order('test_date', { ascending: true });

    if (error) {
      const plainRes = await supabase
        .from('tests')
        .select('*')
        .eq('institute_id', instituteId)
        .order('test_date', { ascending: true });
      if (plainRes.error) {
        console.warn('fetchTests error:', plainRes.error);
        return [];
      }
      return plainRes.data || [];
    }
    return data || [];
  } catch (err) {
    console.warn('fetchTests exception:', err);
    return [];
  }
}

export async function fetchStudentTests(instituteId, { batchId, standard } = {}) {
  if (!supabase || !instituteId || (!batchId && !standard)) return [];

  try {
    let query = supabase
      .from('tests')
      .select('*, batches(id, name), subjects(id, name)')
      .eq('institute_id', instituteId)
      .order('test_date', { ascending: true });

    if (batchId && standard) {
      query = query.or(`batch_id.eq.${batchId},standard.eq.${standard}`);
    } else if (batchId) {
      query = query.eq('batch_id', batchId);
    } else {
      query = query.eq('standard', standard);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  } catch (err) {
    console.warn('fetchStudentTests error:', err);
    return [];
  }
}

export async function createTest(value, instituteId) {
  if (!supabase || !instituteId) throw new Error('Supabase client or institute ID uninitialized.');

  const payload = {
    institute_id: instituteId,
    batch_id: value.batch_id || null,
    subject_id: value.subject_id || null,
    title: value.title || value.test_name || 'Assessment Test',
    test_name: value.test_name || value.title || 'Assessment Test',
    subject: value.subject || null,
    standard: value.standard || null,
    test_type: value.test_type || 'Unit Test',
    total_marks: Number(value.total_marks) || 100,
    passing_marks: Number(value.passing_marks) || 35,
    duration_minutes: Number(value.duration_minutes || value.duration) || 60,
    test_date: value.test_date || new Date().toISOString().slice(0, 10),
  };

  if (typeof console !== 'undefined' && console.log) {
    console.log('[CREATE TEST] payload', payload);
  }

  const { data, error } = await supabase.from('tests').insert([payload]).select().single();
  if (error) throw error;
  return data;
}

export async function publishTest(id, instituteId) {
  if (!supabase || !id) throw new Error('Supabase client or test ID uninitialized.');

  const { data, error } = await supabase
    .from('tests')
    .update({ test_date: new Date().toISOString().slice(0, 10) })
    .eq('id', id)
    .eq('institute_id', instituteId)
    .select()
    .single();

  if (error) throw error;
  return data;
}
