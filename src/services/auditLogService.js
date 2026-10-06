/**
 * auditLogService.js — FastAPI backend edition.
 */
import { apiGet } from '../lib/apiClient';

export async function fetchAuditLogs(instituteId) {
  return [];
}

export async function createAuditLog(action, details) {
  return { action, details };
}
