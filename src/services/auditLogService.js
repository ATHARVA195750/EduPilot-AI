import { supabase } from '../lib/supabase';

export const DEMO_AUDIT_LOGS = [
  {
    id: 'log_1',
    user_email: 'admin@edupilot.com',
    action: 'RECORD_PAYMENT',
    entity: 'Payment',
    entity_id: 'pay_1',
    metadata: { amount: 15000, student: 'Aarav Sharma' },
    created_at: new Date().toISOString()
  },
  {
    id: 'log_2',
    user_email: 'admin@edupilot.com',
    action: 'CREATE_STUDENT',
    entity: 'Student',
    entity_id: 's1',
    metadata: { name: 'Aarav Sharma', batch: 'Batch A' },
    created_at: new Date(Date.now() - 3600000 * 2).toISOString()
  }
];

export async function logAuditAction(action, entity, entityId, metadata = {}, userEmail = 'system', instituteId) {
  const logItem = {
    id: 'log_' + Date.now(),
    user_email: userEmail,
    action,
    entity,
    entity_id: entityId,
    metadata,
    created_at: new Date().toISOString()
  };
  DEMO_AUDIT_LOGS.unshift(logItem);
  if (!supabase) return logItem;
  try {
    await supabase.from('audit_logs').insert({
      institute_id: instituteId,
      user_email: userEmail,
      action,
      entity,
      entity_id: String(entityId),
      metadata
    });
  } catch (e) {}
  return logItem;
}

export async function fetchAuditLogs(instituteId) {
  if (!supabase) return DEMO_AUDIT_LOGS;
  try {
    const { data, error } = await supabase.from('audit_logs').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    return data?.length ? data : DEMO_AUDIT_LOGS;
  } catch (err) {
    return DEMO_AUDIT_LOGS;
  }
}
