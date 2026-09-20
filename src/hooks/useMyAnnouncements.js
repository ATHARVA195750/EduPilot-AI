import { useState, useEffect, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useMyStudentRecord } from './useMyStudentRecord';
import { fetchAnnouncementsByInstitute, fetchAnnouncements, addAnnouncement } from '../services/announcementService';
import { useInstitute } from '../contexts/InstituteContext';

export function useMyAnnouncements() {
  const { data: studentRecord } = useMyStudentRecord();

  return useQuery({
    queryKey: ['myAnnouncements', studentRecord?.institute_id],
    queryFn: async () => {
      if (!studentRecord?.institute_id) return [];
      return fetchAnnouncementsByInstitute(studentRecord.institute_id);
    },
    enabled: Boolean(studentRecord?.institute_id),
    placeholderData: [],
  });
}

export function useAnnouncements() {
  const { instituteId } = useInstitute();
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const list = await fetchAnnouncements(instituteId);
      setAnnouncements(list);
    } catch (err) {
      console.warn('useAnnouncements error:', err);
    } finally {
      setLoading(false);
    }
  }, [instituteId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const postAnnouncement = async (title, message) => {
    const created = await addAnnouncement(title, message, instituteId);
    setAnnouncements(prev => [created, ...prev]);
    return created;
  };

  return { announcements, loading, refresh: loadData, addAnnouncement: postAnnouncement };
}
