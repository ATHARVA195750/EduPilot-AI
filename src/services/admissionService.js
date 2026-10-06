import { apiGet, apiPost, apiPut } from '../lib/apiClient';
import { createStudentRecord, updateStudent, findStudentsForAdmission } from './studentService';

export const ENQUIRY_STATUSES = ['new', 'contacted', 'counselling', 'trial', 'interested', 'admitted', 'lost'];
const normalizeStatus = (status) => String(status || 'new').trim().toLowerCase();

export async function fetchEnquiries(instituteId) {
  const data = await apiGet('/academics/enquiries');
  return data || [];
}

export async function fetchAssignableStaff(instituteId) {
  try {
    const data = await apiGet('/auth/me');
    return data ? [data] : [];
  } catch {
    return [];
  }
}

export async function createEnquiry(enquiryData, instituteId) {
  const payload = {
    student_name: enquiryData.student_name?.trim(),
    parent_name: enquiryData.parent_name?.trim() || null,
    phone: enquiryData.phone?.trim() || null,
    email: enquiryData.email?.trim() || null,
    course_interested: enquiryData.course_interested?.trim() || null,
    counselling_notes: enquiryData.counselling_notes?.trim() || null,
    source: enquiryData.source?.trim() || 'Direct',
    status: normalizeStatus(enquiryData.status),
  };
  if (!payload.student_name) throw new Error('Student name is required.');
  return apiPost('/academics/enquiries', payload);
}

export async function updateEnquiry(id, instituteId, updates) {
  const payload = {};
  if (updates.status !== undefined) payload.status = normalizeStatus(updates.status);
  if (updates.counselling_notes !== undefined) payload.counselling_notes = updates.counselling_notes || null;
  if (updates.student_name !== undefined) payload.student_name = updates.student_name;
  return apiPut(`/academics/enquiries/${enquiry_id_clean(id)}`, payload);
}

function enquiry_id_clean(id) {
  return id;
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
  if (!studentId || !batchId) throw new Error('Student and batch are required for enrollment.');
  return updateStudent(studentId, { batch_id: batchId });
}

export async function createAdmissionFee({ instituteId, studentId, totalAmount, discountAmount = 0, dueDate }) {
  const total = Number(totalAmount);
  const discount = Number(discountAmount || 0);
  if (!Number.isFinite(total) || total < 0) throw new Error('Fee amount must be a valid non-negative number.');
  if (discount < 0 || discount > total) throw new Error('Discount must be between zero and the total fee.');
  return apiPost('/finance/fees', {
    student_id: studentId,
    total_amount: total,
    discount_amount: discount,
    due_date: dueDate || null,
  });
}

export async function convertEnquiry({ enquiry, instituteId, profileId, studentId, studentData, enrollmentData, feeData }) {
  if (!enquiry?.id) throw new Error('Enquiry is required for conversion.');

  // Step 1: Create or update student record via FastAPI backend
  const student = studentId
    ? await updateStudent(studentId, {
        batch_id: studentData?.batch_id || enrollmentData?.batch_id,
        course_id: studentData?.course_id,
      })
    : await createStudentRecord(
        {
          full_name: studentData.full_name || enquiry.student_name,
          standard: studentData.standard || enquiry.standard,
          course_id: studentData.course_id,
          batch_id: studentData.batch_id || enrollmentData?.batch_id,
          parent_name: studentData.parent_name || enquiry.parent_name,
          parent_phone: studentData.parent_phone || enquiry.phone,
          parent_email: studentData.parent_email || enquiry.email,
          school_name: studentData.school_name || enquiry.school_name,
          status: 'Active',
        },
        instituteId
      );

  if (!student?.id) {
    throw new Error('Failed to create or locate student record for conversion.');
  }

  // Step 2: Create admission fee if confirmed
  if (feeData?.confirmed && feeData?.total_amount) {
    try {
      await createAdmissionFee({
        instituteId,
        studentId: student.id,
        totalAmount: feeData.total_amount,
        discountAmount: feeData.discount_amount,
        dueDate: feeData.due_date,
      });
    } catch (feeErr) {
      console.warn('Admission fee creation notice:', feeErr?.message);
    }
  }

  // Step 3: Mark enquiry status as admitted
  const updatedEnquiry = await apiPut(`/academics/enquiries/${enquiry.id}`, {
    status: 'admitted',
  });

  return { enquiry: updatedEnquiry, student };
}

