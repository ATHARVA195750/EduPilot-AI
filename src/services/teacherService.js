import { supabase } from '../lib/supabase';
import { DEMO_TEACHERS } from '../utils/demoData';

function normalizeTeacher(t) {
  if (!t) return null;
  return {
    ...t,
    full_name: t.full_name || t.name || 'Faculty Member',
    email: t.email || '',
    phone: t.phone || '',
    subject: t.specialization || t.subject || 'General Subject',
    specialization: t.specialization || t.subject || 'General Subject',
    qualification: t.qualification || 'Higher Education Degree',
    salary: t.salary ?? null,
    status: t.status || 'Active',
  };
}

export async function fetchTeachers(instituteId) {
  if (!supabase) return [];
  try {
    let query = supabase.from('teachers').select('*').order('created_at', { ascending: false });
    if (instituteId) {
      query = query.eq('institute_id', instituteId);
    }
    const response = await query;
    if (response.error) throw response.error;
    return (response.data || []).map(normalizeTeacher);
  } catch (err) {
    console.error('fetchTeachers error:', err);
    return [];
  }
}

export async function fetchTeacher(id, instituteId) {
  if (!supabase || !id) return null;

  try {
    const response = await supabase
      .from('teachers')
      .select('*, teacher_assignments(id, batch_id, subject_id, status, created_at, batches(id, name, room_number, courses(name)), subjects(id, name, code))')
      .eq('id', id)
      .maybeSingle();

    if (response.error) throw response.error;
    return response.data ? normalizeTeacher(response.data) : null;
  } catch (err) {
    console.error('fetchTeacher error:', err);
    return null;
  }
}

export async function createTeacher(value, instituteId) {
  const payload = {
    full_name: value.full_name || value.name,
    email: value.email || null,
    phone: value.phone || null,
    qualification: value.qualification || null,
    specialization: value.specialization || value.subject || null,
    joining_date: value.joining_date || new Date().toISOString().slice(0, 10),
    salary: value.salary ? Number(value.salary) : null,
    status: value.status || 'Active',
    institute_id: instituteId,
  };

  const teacher = normalizeTeacher({
    id: 't_' + Date.now(),
    ...payload,
    created_at: new Date().toISOString(),
  });
  DEMO_TEACHERS.unshift(teacher);

  if (!supabase) return teacher;
  try {
    const r = await supabase.from('teachers').insert(payload).select().single();
    if (r.error) throw r.error;
    return normalizeTeacher(r.data || teacher);
  } catch (err) {
    console.error('createTeacher error:', err);
    return teacher;
  }
}

export async function updateTeacher(id, value, instituteId) {
  const payload = {
    full_name: value.full_name || value.name,
    email: value.email || null,
    phone: value.phone || null,
    qualification: value.qualification || null,
    specialization: value.specialization || value.subject || null,
    joining_date: value.joining_date || undefined,
    salary: value.salary ? Number(value.salary) : null,
    status: value.status || 'Active',
  };

  Object.keys(payload).forEach((k) => payload[k] === undefined && delete payload[k]);

  const idx = DEMO_TEACHERS.findIndex((t) => t.id === id);
  const updated = normalizeTeacher({ id, ...payload });
  if (idx !== -1) DEMO_TEACHERS[idx] = { ...DEMO_TEACHERS[idx], ...updated };

  if (!supabase) return updated;
  try {
    const r = await supabase.from('teachers').update(payload).eq('id', id).select().single();
    if (r.error) throw r.error;
    return normalizeTeacher(r.data || updated);
  } catch (err) {
    console.error('updateTeacher error:', err);
    return updated;
  }
}

export async function deleteTeacher(id, instituteId) {
  const idx = DEMO_TEACHERS.findIndex((t) => t.id === id);
  if (idx !== -1) DEMO_TEACHERS.splice(idx, 1);
  if (!supabase) return;
  try {
    await supabase.from('teachers').update({ status: 'Inactive' }).eq('id', id);
  } catch (e) {
    console.warn('deleteTeacher warning:', e);
  }
}
