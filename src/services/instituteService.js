/**
 * instituteService.js — FastAPI backend edition.
 */
import { apiGet, apiPut } from '../lib/apiClient';

export async function fetchInstituteDetails(instituteId) {
  const profile = await apiGet('/auth/me');
  return profile?.institute || { id: instituteId, name: 'EduPilot Campus' };
}

export async function updateInstituteDetails(instituteId, updates) {
  return apiPut('/institutes/current', updates);
}

export async function fetchInstituteUsers(instituteId) {
  return [];
}

export async function updateUserProfile(userId, updates) {
  return apiPut('/auth/profile', updates);
}
