/**
 * testService.js — FastAPI backend edition.
 */
import { apiGet, apiPost } from '../lib/apiClient';
import { addAnnouncement } from './announcementService';

export async function fetchTests(instituteId) {
  try {
    const data = await apiGet('/academics/tests');
    return data || [];
  } catch (err) {
    console.warn('fetchTests notice:', err?.message);
    return [];
  }
}

export async function fetchStudentTests(instituteId, { batchId, standard } = {}) {
  try {
    const params = batchId ? { batch_id: batchId } : {};
    const data = await apiGet('/academics/tests', params);
    return data || [];
  } catch (err) {
    console.warn('fetchStudentTests notice:', err?.message);
    return [];
  }
}

export async function createTest(value, instituteId) {
  const payload = {
    batch_id: value.batch_id || null,
    subject: value.subject || value.subject_name || 'General',
    title: value.title || value.test_name || 'Assessment Test',
    test_type: value.test_type || 'Unit Test',
    test_date: value.test_date || new Date().toISOString().slice(0, 10),
    duration_minutes: Number(value.duration_minutes || value.duration) || 60,
    total_marks: Number(value.total_marks) || 100,
    passing_marks: Number(value.passing_marks) || 35,
  };

  const data = await apiPost('/academics/tests', payload);

  if (data && instituteId) {
    try {
      await addAnnouncement(
        `New Test Scheduled: ${data.title}`,
        `Test '${data.title}' is scheduled for ${data.test_date ? new Date(data.test_date).toLocaleDateString('en-IN') : 'upcoming date'}. Total marks: ${data.total_marks}.`,
        instituteId,
        data.batch_id ? { batchId: data.batch_id, targetRole: 'student' } : {}
      );
    } catch (notifErr) {
      console.warn('Announcement creation notice:', notifErr?.message);
    }
  }

  return data;
}

export async function publishTest(id, instituteId) {
  return { id, published: true };
}