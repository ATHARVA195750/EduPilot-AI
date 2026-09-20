import { supabase } from '../lib/supabase';

export async function fetchBranches(instituteId) {
  if (!supabase) return [];
  try {
    let query = supabase.from('branches').select('*').order('created_at', { ascending: false });
    if (instituteId) {
      query = query.eq('institute_id', instituteId);
    }
    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error('Error in fetchBranches:', err);
    return [];
  }
}

export async function createBranch(branchData, instituteId) {
  if (!supabase) throw new Error('Database client uninitialized');
  const payload = {
    name: branchData.name,
    code: branchData.code || null,
    address: branchData.address || null,
    phone: branchData.phone || null,
    email: branchData.email || null,
    institute_id: instituteId,
  };

  const { data, error } = await supabase.from('branches').insert(payload).select().single();
  if (error) throw error;
  return data;
}

export async function updateBranch(id, branchData) {
  if (!supabase) throw new Error('Database client uninitialized');
  const payload = {
    name: branchData.name,
    code: branchData.code || null,
    address: branchData.address || null,
    phone: branchData.phone || null,
    email: branchData.email || null,
  };

  const { data, error } = await supabase.from('branches').update(payload).eq('id', id).select().single();
  if (error) throw error;
  return data;
}
