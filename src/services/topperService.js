/**
 * topperService.js — FastAPI backend edition.
 */
import { apiGet } from '../lib/apiClient';

export async function fetchToppers(instituteId) {
  try {
    const results = await apiGet('/academics/results');
    return results || [];
  } catch (err) {
    return [];
  }
}

export async function generateTopperAnnouncement(testId) {
  return { title: 'Toppers Announced', message: 'Congratulations to the top performers!' };
}

export async function computeBatchToppers(batchId) {
  return [];
}
