/**
 * publicEnquiryService.js — FastAPI backend edition.
 */
import { apiGet, apiPost } from '../lib/apiClient';

export async function fetchPublicInstitute() {
  try {
    const data = await apiGet('/institutes/public', {}, false);
    return data || { id: 'default', name: 'EduPilot Institute' };
  } catch (err) {
    return { id: 'default', name: 'EduPilot Institute' };
  }
}

export async function submitPublicEnquiry({ name, phone, message }) {
  const payload = {
    student_name: name,
    phone,
    counselling_notes: message || null,
  };
  return apiPost('/institutes/public/enquiry', payload, false);
}

/**
 * submitSaaSContact — neutral EduPilot demo/sales request.
 * Stored server-side with NO tenant association (saas_contact_requests),
 * so the public landing page never routes SaaS enquiries into any
 * institute's admission pipeline.
 */
export async function submitSaaSContact({ name, phone, message }) {
  return apiPost(
    '/institutes/contact',
    { name, phone, message: message || null },
    false
  );
}

