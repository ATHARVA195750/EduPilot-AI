import { supabase } from '../lib/supabase';

export const DEMO_NOTIFICATIONS = [
  {
    id: 'notif_1',
    title: 'Fee Installment Reminder',
    message: 'Fee installment of ₹10,000 for Ananya Patel is due on Sept 20, 2026.',
    type: 'fee',
    is_read: false,
    created_at: new Date().toISOString()
  },
  {
    id: 'notif_2',
    title: 'Low Attendance Alert',
    message: 'Student Aarav Sharma has attendance below 75% in Physics.',
    type: 'attendance',
    is_read: false,
    created_at: new Date(Date.now() - 3600000 * 4).toISOString()
  },
  {
    id: 'notif_3',
    title: 'New Homework Assigned',
    message: 'Laws of Motion Numerical Sheet assigned to Class 10th - Batch A.',
    type: 'homework',
    is_read: true,
    created_at: new Date(Date.now() - 3600000 * 24).toISOString()
  }
];

// Extensible Notification Provider Abstraction
class NotificationEngine {
  constructor() {
    this.providers = ['in_app'];
  }

  async send({ title, message, type, recipientId, instituteId }) {
    const notifItem = {
      id: 'notif_' + Date.now(),
      title,
      message,
      type: type || 'info',
      is_read: false,
      created_at: new Date().toISOString()
    };

    DEMO_NOTIFICATIONS.unshift(notifItem);

    if (supabase) {
      try {
        await supabase.from('notifications').insert({
          institute_id: instituteId,
          user_id: recipientId,
          title,
          message,
          type: type || 'info'
        });
      } catch (e) {
        console.warn('Supabase notification dispatch failed:', e.message);
      }
    }

    return notifItem;
  }
}

export const notificationService = new NotificationEngine();

export async function fetchNotifications(instituteId, userId) {
  if (!supabase) return DEMO_NOTIFICATIONS;
  try {
    const { data, error } = await supabase.from('notifications').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    return data?.length ? data : DEMO_NOTIFICATIONS;
  } catch (err) {
    return DEMO_NOTIFICATIONS;
  }
}

export async function fetchStudentNotifications(instituteId, userId) {
  if (!supabase || !instituteId || !userId) return [];
  try {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('institute_id', instituteId)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  } catch (err) {
    console.warn('fetchStudentNotifications error:', err);
    return [];
  }
}

export async function markNotificationAsRead(id) {
  const item = DEMO_NOTIFICATIONS.find(n => n.id === id);
  if (item) item.is_read = true;
  if (!supabase) return;
  try {
    await supabase.from('notifications').update({ is_read: true }).eq('id', id);
  } catch (e) {}
}
