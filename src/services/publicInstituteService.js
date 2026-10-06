/**
 * publicInstituteService.js — FastAPI backend edition.
 */
import { apiGet, apiPost } from '../lib/apiClient';

export async function fetchPublicInstitute() {
  try {
    const data = await apiGet('/institutes/public', {}, false);
    return data || null;
  } catch (err) {
    return null;
  }
}

export async function registerInstitute(payload) {
  // Public onboarding: no JWT exists yet, so this must be unauthenticated.
  // Sending a stale/invalid token would trigger the 401 handler and wipe
  // the session right as registration succeeds.
  return apiPost('/auth/register', payload, false);
}
