import { createClient } from '@supabase/supabase-js';
import { validateQaTarget } from './qaEnvironment.js';

const tenantScopedTables = new Set([
  'announcements',
  'attendance',
  'batches',
  'branches',
  'class_sessions',
  'courses',
  'enquiries',
  'enrollments',
  'expenses',
  'fees',
  'homework',
  'invoices',
  'notifications',
  'payments',
  'payroll',
  'results',
  'students',
  'study_materials',
  'teacher_assignments',
  'teachers',
  'tests',
]);

const cleanupOrder = [
  'notifications', 'announcements', 'attendance', 'homework', 'results', 'tests',
  'study_materials', 'payments', 'invoices', 'fees', 'expenses', 'payroll',
  'class_sessions', 'teacher_assignments', 'enrollments', 'students', 'teachers',
  'subjects', 'batches', 'courses', 'branches', 'enquiries',
];

const createdRows = new Map(cleanupOrder.map((table) => [table, new Set()]));
const createdAuthUserIds = new Set();
let adminClient;

function instituteIds() {
  return [process.env.QA_INSTITUTE_ID, process.env.QA_SECOND_INSTITUTE_ID].filter(Boolean);
}

export function getQaAdminClient() {
  validateQaTarget();
  if (!process.env.QA_SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('QA_SUPABASE_SERVICE_ROLE_KEY is required for QA-only setup and cleanup.');
  }
  if (!adminClient) {
    adminClient = createClient(process.env.QA_SUPABASE_URL, process.env.QA_SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return adminClient;
}

export async function insertQaRow(table, payload) {
  if (table === 'subjects') {
    if (!payload?.course_id) throw new Error('Subject fixtures require a QA course_id.');
    const client = getQaAdminClient();
    const { data: course, error: courseError } = await client
      .from('courses')
      .select('id, institute_id')
      .eq('id', payload.course_id)
      .in('institute_id', instituteIds())
      .maybeSingle();
    if (courseError) throw courseError;
    if (!course) throw new Error('Subject course must belong to an approved QA institute.');
    const { data, error } = await client.from(table).insert(payload).select('id').single();
    if (error) throw error;
    createdRows.get(table).add(data.id);
    return data;
  }

  if (!tenantScopedTables.has(table)) throw new Error(`Fixture insert is not allowed for table: ${table}`);
  if (!payload?.institute_id || !instituteIds().includes(payload.institute_id)) {
    throw new Error('Fixture rows must explicitly target QA_INSTITUTE_ID or QA_SECOND_INSTITUTE_ID.');
  }

  const { data, error } = await getQaAdminClient().from(table).insert(payload).select('id').single();
  if (error) throw error;
  createdRows.get(table).add(data.id);
  return data;
}

export async function selectQaRow(table, id, instituteId = process.env.QA_INSTITUTE_ID) {
  if (table === 'profiles') {
    if (!id || !instituteIds().includes(instituteId)) throw new Error('A QA profile and approved QA institute are required.');
    const { data, error } = await getQaAdminClient()
      .from('profiles')
      .select('id, full_name, email, role, institute_id, status, created_at')
      .eq('id', id)
      .eq('institute_id', instituteId)
      .maybeSingle();
    if (error) throw error;
    return data;
  }

  if (table === 'subjects') {
    if (!id || !instituteIds().includes(instituteId)) throw new Error('A QA subject and approved QA institute are required.');
    const { data, error } = await getQaAdminClient()
      .from('subjects')
      .select('*, courses!inner(id, institute_id)')
      .eq('id', id)
      .eq('courses.institute_id', instituteId)
      .maybeSingle();
    if (error) throw error;
    return data;
  }

  if (!tenantScopedTables.has(table)) throw new Error(`Fixture read is not allowed for table: ${table}`);
  if (!id || !instituteIds().includes(instituteId)) throw new Error('A tracked QA row and approved QA institute are required.');

  const { data, error } = await getQaAdminClient()
    .from(table)
    .select('*')
    .eq('id', id)
    .eq('institute_id', instituteId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export function trackQaAuthUser(userId) {
  validateQaTarget();
  if (!userId) throw new Error('A QA auth user ID is required.');
  createdAuthUserIds.add(userId);
}

export async function createQaAuthUser({ email, password, role, fullName, instituteId = process.env.QA_INSTITUTE_ID }) {
  if (!['owner', 'admin', 'teacher', 'student'].includes(role)) throw new Error('Unsupported QA profile role.');
  if (!email || !password || !fullName || !instituteIds().includes(instituteId)) {
    throw new Error('QA auth user requires credentials, a name, and an approved QA institute.');
  }

  const client = getQaAdminClient();
  const { data, error } = await client.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName, role, institute_id: instituteId },
  });
  if (error) throw error;
  trackQaAuthUser(data.user.id);

  const { error: profileError } = await client.from('profiles').upsert({
    id: data.user.id,
    email,
    full_name: fullName,
    role,
    institute_id: instituteId,
    status: 'Active',
  });
  if (profileError) {
    await client.from('profiles').delete().eq('id', data.user.id).eq('institute_id', instituteId);
    await client.auth.admin.deleteUser(data.user.id);
    createdAuthUserIds.delete(data.user.id);
    throw profileError;
  }

  return { id: data.user.id, email, role, institute_id: instituteId };
}

export async function cleanupQaFixtures() {
  if (![...createdRows.values()].some((ids) => ids.size) && !createdAuthUserIds.size) return;

  const client = getQaAdminClient();
  const failures = [];

  for (const table of cleanupOrder) {
    const ids = [...(createdRows.get(table) || [])];
    if (!ids.length) continue;

    let query = client.from(table).delete().in('id', ids);
    if (table !== 'subjects') query = query.in('institute_id', instituteIds());
    const { error } = await query;
    if (error) failures.push(`${table}: ${error.message}`);
    else createdRows.get(table).clear();
  }

  for (const userId of createdAuthUserIds) {
    const { error: profileError } = await client
      .from('profiles')
      .delete()
      .eq('id', userId)
      .in('institute_id', instituteIds());
    if (profileError) failures.push(`profile: ${profileError.message}`);
    const { error } = await client.auth.admin.deleteUser(userId);
    if (error) failures.push(`auth user: ${error.message}`);
  }
  if (failures.length) throw new Error(`QA cleanup incomplete: ${failures.join('; ')}`);
  createdAuthUserIds.clear();
}