/**
 * adminService.js — FastAPI backend edition.
 */
import { apiGet, apiPost } from '../lib/apiClient';

export async function fetchAdminList() {
  const user = await apiGet('/auth/me');
  return [user];
}

export async function fetchInstituteAdmins(instituteId) {
  return [];
}

export async function createInstituteAdmin(payload, instituteId) {
  return apiPost('/auth/register', payload);
}

export async function registerAdmin(payload) {
  return apiPost('/auth/register', payload);
}
