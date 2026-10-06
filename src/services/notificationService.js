/**
 * notificationService.js — FastAPI backend edition.
 */
import { apiGet, apiPost } from '../lib/apiClient';

export async function fetchNotifications(instituteId) {
  return [];
}

export async function fetchStudentNotifications(instituteId) {
  return [];
}

export async function markNotificationAsRead(id) {
  return { id, is_read: true };
}

export async function createNotification(payload) {
  return { id: 'notif-1', ...payload };
}

export const notificationService = {
  fetchNotifications,
  fetchStudentNotifications,
  markNotificationAsRead,
  createNotification,
};
