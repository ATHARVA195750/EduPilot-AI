import { useState, useEffect, useCallback } from 'react';
import { fetchEnquiries, createEnquiry, updateEnquiry, fetchAssignableStaff, findAdmissionDuplicates, convertEnquiry } from '../services/admissionService';
import { useInstitute } from '../contexts/InstituteContext';

export function useAdmissions() {
  const { instituteId } = useInstitute();
  const [enquiries, setEnquiries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [staff, setStaff] = useState([]);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await fetchEnquiries(instituteId);
      setEnquiries(list);
      setStaff(await fetchAssignableStaff(instituteId));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [instituteId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const addEnquiry = async (data) => {
    const created = await createEnquiry(data, instituteId);
    setEnquiries(prev => [created, ...prev]);
    return created;
  };

  const changeStatus = async (id, status, notes) => {
    // updateEnquiry throws on DB error, so setEnquiries is only reached on success.
    // State is driven by the DB-returned record, not the caller-supplied values,
    // so local state always matches what was actually persisted.
    const updated = await updateEnquiry(id, instituteId, { status, counselling_notes: notes });
    setEnquiries(prev => prev.map(item => item.id === id ? updated : item));
    return updated;
  };

  const updateDetails = async (id, updates) => {
    const updated = await updateEnquiry(id, instituteId, updates);
    setEnquiries(prev => prev.map(item => item.id === id ? updated : item));
    return updated;
  };

  const findDuplicates = (enquiry) => findAdmissionDuplicates(instituteId, enquiry);

  const convert = (payload) => convertEnquiry({ ...payload, instituteId });

  return { enquiries, staff, loading, error, refresh: loadData, addEnquiry, changeStatus, updateDetails, findDuplicates, convert };
}
