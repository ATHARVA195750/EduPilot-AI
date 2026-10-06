/**
 * homeworkService.js — FastAPI backend edition.
 */
import { apiGet, apiPost, apiPut, apiDelete, API_BASE_URL, tokenStore } from '../lib/apiClient';
import { addAnnouncement } from './announcementService';

export async function fetchHomework(filters = {}) {
  try {
    const params = {};
    if (filters.batch_id) params.batch_id = filters.batch_id;
    const data = await apiGet('/academics/homework', params);
    return data || [];
  } catch (err) {
    console.warn('fetchHomework error:', err?.message);
    return [];
  }
}

export async function fetchStudentHomework({ batch_id, standard }) {
  return fetchHomework({ batch_id, standard });
}

export async function createHomework(payload) {
  const cleanPayload = {
    batch_id: payload.batch_id || payload.batchId,
    title: payload.title,
    subject: payload.subject || payload.subject_name || 'General',
    standard: payload.standard || payload.className || 'Class 10th',
    description: payload.description || null,
    due_date: payload.due_date || new Date(Date.now() + 86400000 * 3).toISOString().slice(0, 10),
    file_url: payload.file_url || null,
  };

  const res = await apiPost('/academics/homework', cleanPayload);

  if (res && payload.institute_id) {
    try {
      await addAnnouncement(
        `New Homework: ${res.title}`,
        `Homework assigned for ${res.standard || 'your class'}. Due date: ${res.due_date ? new Date(res.due_date).toLocaleDateString('en-IN') : 'soon'}.`,
        payload.institute_id,
        cleanPayload.batch_id ? { batchId: cleanPayload.batch_id, targetRole: 'student' } : {}
      );
    } catch (notifErr) {
      console.warn('Announcement creation notice:', notifErr?.message);
    }
  }

  return res;
}

export async function updateHomework(id, updates) {
  return apiPut(`/academics/homework/${id}`, updates || {});
}

export async function deleteHomework(id) {
  return apiDelete(`/academics/homework/${id}`);
}

export async function uploadHomeworkFile(file) {
  const form = new FormData();
  form.append('file', file);
  const token = tokenStore.get();
  const res = await fetch(`${API_BASE_URL}/academics/homework/upload`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: form,
  });
  if (!res.ok) {
    throw new Error('Homework file upload failed.');
  }
  return res.json();
}