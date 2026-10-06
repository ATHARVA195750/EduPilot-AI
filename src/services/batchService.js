/**
 * batchService.js — FastAPI backend edition.
 */
import { apiGet, apiPost, apiPut } from '../lib/apiClient';

const BATCH_STATUSES = ['active', 'inactive', 'completed'];

export function normalizeBatchStatus(status) {
  const raw = status == null || String(status).trim() === '' ? 'active' : status;
  const value = String(raw).trim().toLowerCase();
  if (!BATCH_STATUSES.includes(value)) {
    throw new Error(`Invalid batch status "${status}". Expected one of: ${BATCH_STATUSES.join(', ')}.`);
  }
  return value;
}

export function formatBatchStatus(status) {
  const value = String(status ?? 'active').trim().toLowerCase();
  const known = BATCH_STATUSES.includes(value) ? value : 'active';
  return known.charAt(0).toUpperCase() + known.slice(1);
}

export async function fetchBatches(instituteId, params = {}) {
  const data = await apiGet('/academics/batches', params);
  return (data || []).map((b) => ({
    ...b,
    course_name: b.course_name || 'General Course',
    branch_name: b.branch_name || 'Main Campus',
    teacher_names: b.teacher_name || 'Unassigned',
    enrolled_count: b.enrolled_count ?? 0,
  }));
}

export async function createBatch(batchData, instituteId) {
  const payload = {
    name: batchData.name,
    course_id: batchData.course_id || null,
    teacher_id: batchData.teacher_id || null,
    room_number: batchData.room_number || null,
    max_capacity: Number(batchData.max_capacity || 40),
    start_time: batchData.start_time || null,
    end_time: batchData.end_time || null,
    start_date: batchData.start_date || null,
    end_date: batchData.end_date || null,
    schedule_days: batchData.schedule_days || null,
    status: normalizeBatchStatus(batchData.status),
  };
  return apiPost('/academics/batches', payload);
}

export async function updateBatch(id, batchData) {
  const payload = {
    name: batchData.name,
    course_id: batchData.course_id || null,
    teacher_id: batchData.teacher_id || null,
    room_number: batchData.room_number || null,
    max_capacity: Number(batchData.max_capacity || 40),
    start_time: batchData.start_time || null,
    end_time: batchData.end_time || null,
    status: normalizeBatchStatus(batchData.status),
  };
  return apiPut(`/academics/batches/${id}`, payload);
}

export async function transferStudentBatch(studentId, newBatchId) {
  return apiPut(`/students/${studentId}`, { batch_id: newBatchId });
}
