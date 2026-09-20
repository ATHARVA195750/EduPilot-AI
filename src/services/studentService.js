import { supabase } from '../lib/supabase';
import { DEMO_STUDENTS } from '../utils/demoData';

function normalizeStudent(item) {
  if (!item) return null;
  return {
    ...item,
    full_name: item.full_name || item.name || item.student_name || 'Student',
    standard: item.standard || item.class || item.grade || 'Class 10th',
    parent_phone: item.parent_phone || item.phone || item.contact || '',
    status: item.status || 'Active',
    course_name: item.courses?.name || item.course_name || 'General Course',
    batch_name: item.batches?.name || item.batch_name || 'Unassigned Batch',
  };
}

export async function fetchStudents(instituteId) {
  if (!supabase) return [];
  try {
    let query = supabase
      .from('students')
      .select('*, courses(id, name), batches(id, name, room_number)')
      .order('created_at', { ascending: false });

    if (instituteId) {
      query = query.eq('institute_id', instituteId);
    }

    const response = await query;
    if (response.error) throw response.error;
    return (response.data || []).map(normalizeStudent);
  } catch (err) {
    console.error('fetchStudents error:', err);
    return [];
  }
}

export async function fetchStudentByUserId(userId) {
  if (!supabase || !userId) return null;
  try {
    const response = await supabase
      .from('students')
      .select('*, courses(id, name), batches(id, name, room_number)')
      .eq('user_id', userId)
      .maybeSingle();

    if (response.error) throw response.error;
    return response.data ? normalizeStudent(response.data) : null;
  } catch (err) {
    console.error('fetchStudentByUserId error:', err);
    return null;
  }
}

export async function fetchStudent(id, instituteId) {
  if (!supabase || !id) return null;

  try {
    const response = await supabase
      .from('students')
      .select('*, courses(id, name), batches(id, name, room_number), enrollments(*)')
      .eq('id', id)
      .maybeSingle();

    if (response.error) throw response.error;
    if (response.data) {
      const student = normalizeStudent(response.data);
      if (Array.isArray(response.data.enrollments)) {
        student.enrollments = [...response.data.enrollments].sort(
          (a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0)
        );
      } else {
        student.enrollments = [];
      }
      return student;
    }
    return null;
  } catch (err) {
    console.error('fetchStudent error:', err);
    return null;
  }
}

export async function createStudent(studentData, instituteId) {
  const payload = {
    institute_id: instituteId,
    full_name: studentData.full_name,
    student_id_code: studentData.student_id_code || `STU-${Math.floor(10000 + Math.random() * 90000)}`,
    standard: studentData.standard || null,
    course_id: studentData.course_id || null,
    batch_id: studentData.batch_id || null,
    gender: studentData.gender || null,
    dob: studentData.dob || null,
    address: studentData.address || null,
    parent_name: studentData.parent_name || null,
    parent_relation: studentData.parent_relation || 'Parent',
    parent_phone: studentData.parent_phone || null,
    parent_email: studentData.parent_email || null,
    emergency_contact: studentData.emergency_contact || null,
    admission_date: studentData.admission_date || new Date().toISOString().slice(0, 10),
    status: studentData.status || 'Active',
  };

  const newStudent = normalizeStudent({
    id: 's_' + Date.now(),
    ...payload,
    created_at: new Date().toISOString(),
  });
  DEMO_STUDENTS.unshift(newStudent);

  if (!supabase) return newStudent;

  try {
    // 1. Create student record
    const response = await supabase.from('students').insert(payload).select().single();
    if (response.error) throw response.error;
    const createdStudent = normalizeStudent(response.data);

    // 2. Create initial enrollment record in enrollments table if batch_id is set
    if (createdStudent && payload.batch_id) {
      try {
        await supabase.from('enrollments').insert({
          institute_id: instituteId,
          student_id: createdStudent.id,
          batch_id: payload.batch_id,
          status: 'Active',
        });
      } catch (enrollErr) {
        console.warn('Enrollment record creation warning:', enrollErr);
      }
    }

    return createdStudent;
  } catch (err) {
    console.error('createStudent error:', err);
    return newStudent;
  }
}

export async function findStudentsForAdmission(instituteId) {
  if (!supabase || !instituteId) throw new Error('Institute context is required.');
  const { data, error } = await supabase
    .from('students')
    .select('id, full_name, student_id_code, email, parent_phone, course_id, batch_id, standard, status')
    .eq('institute_id', instituteId);
  if (error) throw error;
  return data || [];
}

export async function createStudentRecord(studentData, instituteId) {
  if (!supabase || !instituteId) throw new Error('Institute context is required.');
  const payload = {
    institute_id: instituteId,
    full_name: studentData.full_name,
    student_id_code: studentData.student_id_code || `STU-${Math.floor(10000 + Math.random() * 90000)}`,
    email: studentData.email || null,
    standard: studentData.standard || null,
    course_id: studentData.course_id || null,
    batch_id: studentData.batch_id || null,
    parent_name: studentData.parent_name || null,
    parent_relation: studentData.parent_relation || 'Parent',
    parent_phone: studentData.parent_phone || null,
    parent_email: studentData.parent_email || null,
    emergency_contact: studentData.emergency_contact || null,
    school_name: studentData.school_name || null,
    admission_date: studentData.admission_date || new Date().toISOString().slice(0, 10),
    status: studentData.status || 'Active',
  };
  const { data, error } = await supabase.from('students').insert(payload).select().single();
  if (error) throw error;
  return data;
}

export async function updateStudent(id, studentData, instituteId) {
  const payload = {
    full_name: studentData.full_name,
    student_id_code: studentData.student_id_code || undefined,
    standard: studentData.standard || null,
    course_id: studentData.course_id || null,
    batch_id: studentData.batch_id || null,
    gender: studentData.gender || null,
    dob: studentData.dob || null,
    address: studentData.address || null,
    parent_name: studentData.parent_name || null,
    parent_relation: studentData.parent_relation || 'Parent',
    parent_phone: studentData.parent_phone || null,
    parent_email: studentData.parent_email || null,
    emergency_contact: studentData.emergency_contact || null,
    admission_date: studentData.admission_date || undefined,
    status: studentData.status || 'Active',
  };

  // Remove undefined fields
  Object.keys(payload).forEach((k) => payload[k] === undefined && delete payload[k]);

  const idx = DEMO_STUDENTS.findIndex((s) => s.id === id);
  const updated = normalizeStudent({ id, ...payload });
  if (idx !== -1) DEMO_STUDENTS[idx] = { ...DEMO_STUDENTS[idx], ...updated };

  if (!supabase) return updated;

  try {
    // Fetch previous student record to check if batch_id changed
    const { data: prevStudent } = await supabase
      .from('students')
      .select('batch_id, course_id')
      .eq('id', id)
      .maybeSingle();

    // 1. Update student record
    const response = await supabase.from('students').update(payload).eq('id', id).select().single();
    if (response.error) throw response.error;

    // 2. Handle batch transfer in enrollments table if batch_id changed
    if (payload.batch_id && prevStudent && prevStudent.batch_id !== payload.batch_id) {
      try {
        const todayStr = new Date().toISOString().slice(0, 10);

        // Deactivate previous active enrollment for this student
        await supabase
          .from('enrollments')
          .update({ status: 'Completed', end_date: todayStr })
          .eq('student_id', id)
          .eq('status', 'Active');

        // Insert new active enrollment record
        await supabase.from('enrollments').insert({
          institute_id: instituteId,
          student_id: id,
          batch_id: payload.batch_id,
          status: 'Active',
        });
      } catch (enrollErr) {
        console.warn('Batch transfer enrollment update warning:', enrollErr);
      }
    }

    return normalizeStudent(response.data || updated);
  } catch (err) {
    console.error('updateStudent error:', err);
    return updated;
  }
}

export async function deleteStudent(id, instituteId) {
  const idx = DEMO_STUDENTS.findIndex((s) => s.id === id);
  if (idx !== -1) DEMO_STUDENTS.splice(idx, 1);
  if (!supabase) return;
  try {
    // Deactivate/Soft delete student record by status
    await supabase.from('students').update({ status: 'Inactive' }).eq('id', id);
  } catch (err) {
    console.warn('deleteStudent deactivation warning:', err);
  }
}
