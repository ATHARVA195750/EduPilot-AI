/**
 * announcementService.js — FastAPI backend edition.
 */
import { apiGet, apiPost } from '../lib/apiClient';

export async function fetchAnnouncements(instituteId) {
  try {
    const data = await apiGet('/communication/announcements');
    return data || [];
  } catch (err) {
    console.warn('fetchAnnouncements error:', err?.message);
    return [];
  }
}

export async function fetchAnnouncementsByInstitute(instituteId) {
  return fetchAnnouncements(instituteId);
}

export async function addAnnouncement(title, message, instituteId, options = {}) {
  const payload = {
    title,
    message,
    target_role: options.targetRole || 'all',
    batch_id: options.batchId || null,
    priority: options.priority || 'Normal',
  };
  return apiPost('/communication/announcements', payload);
}
