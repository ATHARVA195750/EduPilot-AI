import { supabase } from '../lib/supabase';

export const DEMO_COURSES = [
  {
    id: 'c1',
    name: 'Class 10th CBSE Comprehensive',
    standard: 'Class 10th',
    board: 'CBSE',
    duration_months: 12,
    base_fee: 18000,
    description: 'Complete academic prep for Class 10th CBSE Board Examinations.',
    status: 'Active',
  },
  {
    id: 'c2',
    name: 'Class 12th Physics & Chemistry Masterclass',
    standard: 'Class 12th',
    board: 'CBSE',
    duration_months: 12,
    base_fee: 24000,
    description: 'Advanced problem solving and board prep for Physics and Chemistry.',
    status: 'Active',
  },
  {
    id: 'c3',
    name: 'Class 9th Foundation Course',
    standard: 'Class 9th',
    board: 'ICSE',
    duration_months: 10,
    base_fee: 15000,
    description: 'Strengthening fundamental concepts for secondary school.',
    status: 'Active',
  },
];

export async function fetchCourses(instituteId) {
  if (!supabase) return DEMO_COURSES;
  try {
    let query = supabase.from('courses').select('*, subjects(*)').order('created_at', { ascending: false });
    if (instituteId) {
      query = query.eq('institute_id', instituteId);
    }
    const { data, error } = await query;
    if (error) throw error;
    return data?.length ? data : DEMO_COURSES;
  } catch (err) {
    console.warn('fetchCourses fallback to DEMO_COURSES:', err);
    return DEMO_COURSES;
  }
}

export async function createCourse(courseData, instituteId) {
  const payload = {
    name: courseData.name,
    code: courseData.code || null,
    standard: courseData.standard || null,
    board: courseData.board || null,
    duration_months: Number(courseData.duration_months || 12),
    base_fee: Number(courseData.base_fee || 0),
    description: courseData.description || null,
    status: courseData.status || 'Active',
    institute_id: instituteId,
  };

  const newCourse = { id: 'c_' + Date.now(), ...payload };
  DEMO_COURSES.unshift(newCourse);

  if (!supabase) return newCourse;
  try {
    const { data, error } = await supabase.from('courses').insert(payload).select().single();
    if (error) throw error;
    return data || newCourse;
  } catch (err) {
    console.error('Error creating course in Supabase:', err);
    return newCourse;
  }
}

export async function updateCourse(id, courseData) {
  const payload = {
    name: courseData.name,
    code: courseData.code || null,
    standard: courseData.standard || null,
    board: courseData.board || null,
    duration_months: Number(courseData.duration_months || 12),
    base_fee: Number(courseData.base_fee || 0),
    description: courseData.description || null,
    status: courseData.status || 'Active',
  };

  const idx = DEMO_COURSES.findIndex((c) => c.id === id);
  if (idx !== -1) {
    DEMO_COURSES[idx] = { ...DEMO_COURSES[idx], ...payload };
  }

  if (!supabase) return { id, ...payload };
  try {
    const { data, error } = await supabase.from('courses').update(payload).eq('id', id).select().single();
    if (error) throw error;
    return data;
  } catch (err) {
    console.error('Error updating course in Supabase:', err);
    return { id, ...payload };
  }
}
