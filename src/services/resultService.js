import { supabase } from '../lib/supabase';

const client = () => {
  if (!supabase) throw new Error('Supabase is not configured.');
  return supabase;
};

// Note: public.results schema columns verified on live database:
// id, student_id, test_id, marks, total_marks, percentage, rank, remarks, created_at
// THERE IS NO grade COLUMN IN THE DATABASE TABLE.

export async function fetchResults() {
  try {
    const response = await client()
      .from('results')
      .select('*, students(id, full_name, standard, batch_id, batches(name)), tests(id, title, test_name, subject, total_marks)')
      .order('created_at', { ascending: false });

    if (response.error) {
      // Fallback to plain query if relationship join encounters schema cache restriction
      const plainRes = await client().from('results').select('*').order('created_at', { ascending: false });
      if (plainRes.error) throw plainRes.error;
      return plainRes.data || [];
    }
    return response.data || [];
  } catch (err) {
    console.warn('fetchResults notice:', err?.message);
    const plainRes = await client().from('results').select('*').order('created_at', { ascending: false });
    if (plainRes.error) throw plainRes.error;
    return plainRes.data || [];
  }
}

export async function createResult(resultData) {
  const payload = {
    student_id: resultData.student_id,
    test_id: resultData.test_id || null,
    marks: Number(resultData.marks),
    total_marks: Number(resultData.total_marks),
    percentage: Number(resultData.percentage),
    rank: resultData.rank ? Number(resultData.rank) : null,
    remarks: resultData.remarks || null,
  };

  if (typeof console !== 'undefined' && console.log) {
    console.log('[CREATE RESULT] payload', payload);
  }

  const response = await client().from('results').insert([payload]).select().single();
  if (response.error) throw response.error;
  return response.data;
}