import { useState, useEffect, useCallback } from 'react';
import { fetchBatches, createBatch, updateBatch, transferStudentBatch } from '../services/batchService';
import { useInstitute } from '../contexts/InstituteContext';

export function useBatches() {
  const { instituteId } = useInstitute();
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const list = await fetchBatches(instituteId);
      setBatches(list);
    } catch (err) {
      console.warn('useBatches error:', err);
    } finally {
      setLoading(false);
    }
  }, [instituteId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const addBatch = async (data) => {
    const created = await createBatch(data, instituteId);
    await loadData();
    return created;
  };

  const editBatch = async (id, data) => {
    const updated = await updateBatch(id, data);
    await loadData();
    return updated;
  };

  const transferStudent = async (studentId, newBatchId) => {
    await transferStudentBatch(studentId, newBatchId);
    await loadData();
  };

  return { batches, loading, refresh: loadData, addBatch, editBatch, transferStudent };
}
