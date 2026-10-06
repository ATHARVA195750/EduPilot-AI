/**
 * studyMaterialService.js — FastAPI backend edition.
 */
import { apiGet, apiPost, apiPut, apiDelete, API_BASE_URL } from '../lib/apiClient';

export async function fetchStudyMaterials(filters = {}) {
  const queryParams = new URLSearchParams();
  if (filters.batch_id) queryParams.append('batch_id', filters.batch_id);
  if (filters.subject_id) queryParams.append('subject_id', filters.subject_id);

  const url = `/academics/study-materials?${queryParams.toString()}`;
  const data = await apiGet(url);
  return data || [];
}

export async function fetchStudentStudyMaterials({ batch_id, standard }) {
  return fetchStudyMaterials({ batch_id });
}

export async function createStudyMaterial(payload) {
  const cleanPayload = {
    title: payload.title,
    description: payload.description || null,
    batch_id: payload.batch_id || null,
    subject_id: payload.subject_id || null,
    material_type: payload.material_type || 'document',
    file_url: payload.file_url || null,
    external_url: payload.external_url || null,
    is_published: payload.is_published !== undefined ? payload.is_published : true,
  };
  return apiPost('/academics/study-materials', cleanPayload);
}

export async function updateStudyMaterial(id, updates) {
  // Real persistence: PUT to FastAPI (was a local stub that faked state).
  return apiPut(`/academics/study-materials/${id}`, updates);
}

export async function togglePublishStudyMaterial(id, is_published) {
  return updateStudyMaterial(id, { is_published });
}

export async function uploadStudyMaterialFile(file) {
  const API_BASE = API_BASE_URL;
  const formData = new FormData();
  formData.append('file', file);
  const token = sessionStorage.getItem('edupilot_token');
  const response = await fetch(`${API_BASE}/academics/study-materials/upload`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  });
  if (!response.ok) {
    let msg = `HTTP ${response.status}`;
    try {
      const err = await response.json();
      msg = err?.detail || err?.message || msg;
    } catch {}
    throw new Error(msg);
  }
  return response.json();
}

export async function deleteStudyMaterial(id) {
  // Real persistence: DELETE on FastAPI (was a local stub that faked state).
  return apiDelete(`/academics/study-materials/${id}`);
}
