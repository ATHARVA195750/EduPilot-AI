/**
 * resultService.js — FastAPI backend edition.
 */
import { apiGet, apiPost } from '../lib/apiClient';

export async function fetchResults(filters = {}) {
  try {
    const params = {};
    if (filters.test_id) params.test_id = filters.test_id;
    if (filters.student_id) params.student_id = filters.student_id;
    const data = await apiGet('/academics/results', params);
    return data || [];
  } catch (err) {
    console.warn('fetchResults notice:', err?.message);
    return [];
  }
}

export async function createResult(resultData) {
  const payload = {
    test_id: resultData.test_id,
    student_id: resultData.student_id,
    marks_obtained: Number(resultData.marks || resultData.marks_obtained),
    total_marks: Number(resultData.total_marks),
    remarks: resultData.remarks || null,
  };

  return apiPost('/academics/results', payload);
}