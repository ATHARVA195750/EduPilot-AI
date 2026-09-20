import { supabase } from '../lib/supabase';
import { DEMO_ANNOUNCEMENTS } from '../utils/demoData';

export async function fetchAnnouncements(instituteId) {
  if (!supabase) return DEMO_ANNOUNCEMENTS;
  try {
    const response = await supabase
      .from('announcements')
      .select('*')
      .order('created_at', { ascending: false });
    if (response.error) throw response.error;
    return response.data?.length ? response.data : DEMO_ANNOUNCEMENTS;
  } catch (err) {
    return DEMO_ANNOUNCEMENTS;
  }
}

export async function fetchAnnouncementsByInstitute(instituteId) {
  if (!supabase || !instituteId) return [];

  try {
    const { data, error } = await supabase
      .from('announcements')
      .select('*')
      .eq('institute_id', instituteId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (err) {
    console.warn('fetchAnnouncementsByInstitute error:', err);
    return [];
  }
}

export async function addAnnouncement(title, message, instituteId) {
  const newAnn = {
    id: 'ann_' + Date.now(),
    title,
    message,
    created_at: new Date().toISOString()
  };
  DEMO_ANNOUNCEMENTS.unshift(newAnn);
  if (!supabase) return newAnn;
  try {
    const { data, error } = await supabase
      .from('announcements')
      .insert({ title, message, institute_id: instituteId })
      .select()
      .single();
    if (error) throw error;
    return data || newAnn;
  } catch (err) {
    return newAnn;
  }
}
