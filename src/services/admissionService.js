import { supabase } from '../lib/supabase';
import { createStudentRecord, findStudentsForAdmission } from './studentService';

const client = () => {
  if (!supabase) throw new Error('Supabase is not configured.');
  return supabase;
};

export const ENQUIRY_STATUSES = ['new', 'contacted', 'counselling', 'trial', 'interested', 'admitted', 'lost'];
const normalizeStatus = (status) => String(status || 'new').trim().toLowerCase();

export async function fetchEnquiries(instituteId) {
  if (!instituteId) throw new Error('Institute context is required to load enquiries.');
  const { data, error } = await client().from('enquiries').select('*').eq('institute_id', instituteId).order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function fetchAssignableStaff(instituteId) {
  if (!instituteId) return [];
  const { data, error } = await client().from('profiles').select('id, full_name, role').eq('institute_id', instituteId).in('role', ['owner', 'admin']);
  if (error) throw error;
  return data || [];
}

export async function createEnquiry(enquiryData, instituteId) {
  if (!instituteId) throw new Error('Institute context is required to create an enquiry.');
  const payload = {
    institute_id: instituteId,
    branch_id: enquiryData.branch_id || null,
    student_name: enquiryData.student_name?.trim(),
    parent_name: enquiryData.parent_name?.trim() || null,
    phone: enquiryData.phone?.trim() || null,
    email: enquiryData.email?.trim() || null,
    school_name: enquiryData.school_name?.trim() || null,
    standard: enquiryData.standard || null,
    course_interested: enquiryData.course_interested?.trim() || null,
    source: enquiryData.source?.trim() || null,
    status: normalizeStatus(enquiryData.status),
    follow_up_date: enquiryData.follow_up_date || null,
    counselling_notes: enquiryData.counselling_notes?.trim() || null,
    assigned_to: enquiryData.assigned_to || null,
  };
  if (!payload.student_name) throw new Error('Student name is required.');
  const { data, error } = await client().from('enquiries').insert(payload).select().single();
  if (error) throw error;
  return data;
}

export async function updateEnquiry(id, instituteId, updates) {
  if (!id || !instituteId) throw new Error('Enquiry and institute context are required.');
  const payload = {};
  if (updates.status !== undefined) payload.status = normalizeStatus(updates.status);
  if (updates.follow_up_date !== undefined) payload.follow_up_date = updates.follow_up_date || null;
  if (updates.counselling_notes !== undefined) payload.counselling_notes = updates.counselling_notes || null;
  if (updates.assigned_to !== undefined) payload.assigned_to = updates.assigned_to || null;
  if (updates.branch_id !== undefined) payload.branch_id = updates.branch_id || null;
  const { data, error } = await client().from('enquiries').update(payload).eq('id', id).eq('institute_id', instituteId).select().single();
  if (error) throw error;
  return data;
}

export async function findAdmissionDuplicates(instituteId, enquiry) {
  const students = await findStudentsForAdmission(instituteId);
  const normalize = (value) => String(value || '').replace(/\D/g, '');
  const normalizeEmail = (value) => String(value || '').trim().toLowerCase();
  const name = String(enquiry.student_name || '').trim().toLowerCase();
  const phone = normalize(enquiry.phone);
  const email = normalizeEmail(enquiry.email);
  const code = String(enquiry.student_id_code || '').trim().toLowerCase();
  return students.filter((student) => {
    const samePhone = phone && normalize(student.parent_phone) === phone;
    const sameEmail = email && normalizeEmail(student.email) === email;
    const sameName = name && String(student.full_name || '').trim().toLowerCase() === name;
    const sameCode = code && String(student.student_id_code || '').trim().toLowerCase() === code;
    return samePhone || sameEmail || sameCode || (sameName && samePhone);
  });
}

export async function createEnrollment({ instituteId, studentId, batchId, enrollmentDate }) {
  if (!instituteId || !studentId || !batchId) throw new Error('Institute, student, and batch are required for enrollment.');
  const { data: existing, error: existingError } = await client().from('enrollments').select('id').eq('institute_id', instituteId).eq('student_id', studentId).eq('batch_id', batchId).maybeSingle();
  if (existingError) throw existingError;
  if (existing) throw new Error('This student is already enrolled in the selected batch.');
  const { data, error } = await client().from('enrollments').insert({ institute_id: instituteId, student_id: studentId, batch_id: batchId, enrollment_date: enrollmentDate || new Date().toISOString().slice(0, 10), status: 'active' }).select().single();
  if (error) throw error;
  return data;
}

export async function createAdmissionFee({ instituteId, studentId, totalAmount, discountAmount = 0, dueDate }) {
  const total = Number(totalAmount);
  const discount = Number(discountAmount || 0);
  if (!Number.isFinite(total) || total < 0) throw new Error('Fee amount must be a valid non-negative number.');
  if (discount < 0 || discount > total) throw new Error('Discount must be between zero and the total fee.');
  const { data, error } = await client().from('fees').insert({ institute_id: instituteId, student_id: studentId, total_amount: total, discount_amount: discount, paid_amount: 0, due_amount: total - discount, due_date: dueDate || null, payment_status: 'pending', payment_mode: 'cash' }).select().single();
  if (error) throw error;
  return data;
}

export async function convertEnquiry({ enquiry, instituteId, profileId, studentId, studentData, enrollmentData, feeData }) {
  if (!enquiry?.id || !instituteId || !profileId) throw new Error('Enquiry, institute, and authenticated profile are required.');
  const student = studentId ? { id: studentId } : await createStudentRecord(studentData, instituteId);
  try {
    const enrollment = await createEnrollment({ instituteId, studentId: student.id, batchId: enrollmentData.batch_id, enrollmentDate: enrollmentData.enrollment_date });
    if (feeData?.confirmed) await createAdmissionFee({ instituteId, studentId: student.id, totalAmount: feeData.total_amount, discountAmount: feeData.discount_amount, dueDate: feeData.due_date });
    const { data: converted, error } = await client().from('enquiries').update({ status: 'admitted', converted_student_id: student.id, converted_at: new Date().toISOString(), converted_by: profileId }).eq('id', enquiry.id).eq('institute_id', instituteId).select().single();
    if (error) throw error;
    return { enquiry: converted, student, enrollment };
  } catch (error) {
    throw new Error(`Admission conversion stopped: ${error.message}`);
  }
}
