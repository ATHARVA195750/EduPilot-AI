import { useState, useEffect, useCallback } from 'react';
import { fetchNotifications, fetchStudentNotifications, markNotificationAsRead, notificationService } from '../services/notificationService';
import { useInstitute } from '../contexts/InstituteContext';
import { useAuthContext } from '../contexts/AuthContext';

export function useNotifications() {
  const { instituteId } = useInstitute();
  const { user } = useAuthContext();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const list = await fetchNotifications(instituteId, user?.id);
      setNotifications(list);
    } catch (err) {
      console.warn('useNotifications error:', err);
    } finally {
      setLoading(false);
    }
  }, [instituteId, user?.id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const markRead = async (id) => {
    await markNotificationAsRead(id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
  };

  const sendNotification = async (data) => {
    const sent = await notificationService.send({ ...data, instituteId });
    setNotifications(prev => [sent, ...prev]);
    return sent;
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return { notifications, unreadCount, loading, refresh: loadData, markRead, sendNotification };
}

export function useStudentNotifications() {
  const { instituteId } = useInstitute();
  const { user } = useAuthContext();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      setNotifications(await fetchStudentNotifications(instituteId, user?.id));
    } catch (err) {
      console.warn('useStudentNotifications error:', err);
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  }, [instituteId, user?.id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const markRead = async (id) => {
    await markNotificationAsRead(id);
    setNotifications((prev) => prev.map((item) => item.id === id ? { ...item, is_read: true } : item));
  };

  return { notifications, loading, refresh: loadData, markRead };
}
