import { useState, useEffect, useCallback } from 'react';
import { fetchBranches, createBranch, updateBranch } from '../services/branchService';
import { useInstitute } from '../contexts/InstituteContext';

export function useBranches() {
  const { instituteId } = useInstitute();
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const list = await fetchBranches(instituteId);
      setBranches(list);
    } catch (err) {
      console.warn('useBranches error:', err);
    } finally {
      setLoading(false);
    }
  }, [instituteId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const addBranch = async (data) => {
    const created = await createBranch(data, instituteId);
    await loadData();
    return created;
  };

  const editBranch = async (id, data) => {
    const updated = await updateBranch(id, data);
    await loadData();
    return updated;
  };

  return { branches, loading, refresh: loadData, addBranch, editBranch };
}
