/**
 * branchService.js — FastAPI backend edition.
 */
import { apiGet, apiPost, apiPut } from '../lib/apiClient';

export async function fetchBranches(instituteId) {
  const data = await apiGet('/institutes/branches');
  return data || [];
}

export async function createBranch(branchData, instituteId) {
  const payload = {
    name: branchData.name,
    code: branchData.code || null,
    address: branchData.address || null,
    phone: branchData.phone || null,
    email: branchData.email || null,
    is_main_branch: Boolean(branchData.is_main_branch),
  };
  return apiPost('/institutes/branches', payload);
}

export async function updateBranch(id, branchData) {
  const payload = {
    name: branchData.name,
    code: branchData.code || null,
    address: branchData.address || null,
    phone: branchData.phone || null,
    email: branchData.email || null,
  };
  return apiPut(`/institutes/branches/${id}`, payload);
}

