import { supabase } from '../lib/supabase';

export const DEMO_BATCHES = [
  {
    id: 'b1',
    name: 'Class 10th - Batch A',
    course_id: 'c1',
    course_name: 'Class 10th CBSE Comprehensive',
    branch_name: 'Main Campus',
    teacher_names: 'Dr. Rajesh Kumar',
    room_number: 'Room 101',
    max_capacity: 40,
    enrolled_count: 38,
    schedule_days: 'Mon, Wed, Fri',
    start_time: '18:00',
    end_time: '19:30',
    status: 'Active',
  },
  {
    id: 'b2',
    name: 'Class 12th - Batch B',
    course_id: 'c2',
    course_name: 'Class 12th Physics & Chemistry Masterclass',
    branch_name: 'City Branch',
    teacher_names: 'Sunita Gupta',
    room_number: 'Lab 2',
    max_capacity: 30,
    enrolled_count: 24,
    schedule_days: 'Tue, Thu, Sat',
    start_time: '17:00',
    end_time: '18:30',
    status: 'Active',
  },
];

export async function fetchBatches(instituteId) {
  if (!supabase) return DEMO_BATCHES;
  try {
    let query = supabase
      .from('batches')
      .select('*, courses(id, name), branches(id, name)')
      .order('created_at', { ascending: false });

    if (instituteId) {
      query = query.eq('institute_id', instituteId);
    }

    const { data: rawBatches, error } = await query;
    if (error) throw error;

    if (!rawBatches || rawBatches.length === 0) {
      return DEMO_BATCHES;
    }

    // Query teacher assignments to map assigned faculty per batch
    const { data: assignments } = await supabase
      .from('teacher_assignments')
      .select('batch_id, teachers(id, full_name)');

    const teacherMap = {};
    if (Array.isArray(assignments)) {
      assignments.forEach((a) => {
        if (a.batch_id && a.teachers?.full_name) {
          if (!teacherMap[a.batch_id]) teacherMap[a.batch_id] = [];
          if (!teacherMap[a.batch_id].includes(a.teachers.full_name)) {
            teacherMap[a.batch_id].push(a.teachers.full_name);
          }
        }
      });
    }

    // Query enrolled student counts per batch
    const { data: studentCounts } = await supabase
      .from('students')
      .select('batch_id');

    const countsMap = {};
    if (Array.isArray(studentCounts)) {
      studentCounts.forEach((s) => {
        if (s.batch_id) {
          countsMap[s.batch_id] = (countsMap[s.batch_id] || 0) + 1;
        }
      });
    }

    return rawBatches.map((b) => ({
      ...b,
      course_name: b.courses?.name || b.course_name || 'General Course',
      branch_name: b.branches?.name || b.branch_name || 'Main Campus',
      teacher_names: (teacherMap[b.id] && teacherMap[b.id].length > 0)
        ? teacherMap[b.id].join(', ')
        : (b.teacher_name || 'Unassigned'),
      enrolled_count: countsMap[b.id] ?? b.enrolled_count ?? 0,
    }));
  } catch (err) {
    console.warn('fetchBatches fallback to DEMO_BATCHES:', err);
    return DEMO_BATCHES;
  }
}

export async function createBatch(batchData, instituteId) {
  // Only insert columns that exist on live batches table:
  // id, institute_id, branch_id, course_id, name, status, code, standard, room_number, max_capacity, start_date, end_date, start_time, end_time
  const payload = {
    name: batchData.name,
    course_id: batchData.course_id || null,
    branch_id: batchData.branch_id || null,
    room_number: batchData.room_number || null,
    max_capacity: Number(batchData.max_capacity || 40),
    start_time: batchData.start_time || null,
    end_time: batchData.end_time || null,
    status: batchData.status || 'Active',
    institute_id: instituteId,
  };

  const newBatch = { id: 'b_' + Date.now(), enrolled_count: 0, ...payload };
  DEMO_BATCHES.unshift(newBatch);

  if (!supabase) return newBatch;
  try {
    const { data, error } = await supabase.from('batches').insert(payload).select().single();
    if (error) throw error;
    return data || newBatch;
  } catch (err) {
    console.error('Error creating batch in Supabase:', err);
    return newBatch;
  }
}

export async function updateBatch(id, batchData) {
  const payload = {
    name: batchData.name,
    course_id: batchData.course_id || null,
    branch_id: batchData.branch_id || null,
    room_number: batchData.room_number || null,
    max_capacity: Number(batchData.max_capacity || 40),
    start_time: batchData.start_time || null,
    end_time: batchData.end_time || null,
    status: batchData.status || 'Active',
  };

  const idx = DEMO_BATCHES.findIndex((b) => b.id === id);
  if (idx !== -1) {
    DEMO_BATCHES[idx] = { ...DEMO_BATCHES[idx], ...payload };
  }

  if (!supabase) return { id, ...payload };
  try {
    const { data, error } = await supabase.from('batches').update(payload).eq('id', id).select().single();
    if (error) throw error;
    return data;
  } catch (err) {
    console.error('Error updating batch in Supabase:', err);
    return { id, ...payload };
  }
}

export async function transferStudentBatch(studentId, newBatchId) {
  if (!supabase) return { success: true };
  try {
    const { error } = await supabase.from('students').update({ batch_id: newBatchId }).eq('id', studentId);
    if (error) throw error;
    return { success: true };
  } catch (err) {
    console.error('Error transferring student batch:', err);
    return { success: false, error: err.message };
  }
}
