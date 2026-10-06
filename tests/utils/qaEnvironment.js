import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const repositoryRoot = fileURLToPath(new URL('../../', import.meta.url));
const supabaseConfig = readFileSync(`${repositoryRoot}supabase/config.toml`, 'utf8');
const productionRef = supabaseConfig.match(/^# Remote project ref: ([a-z0-9]+)$/m)?.[1];

function projectRefFromUrl(value) {
  try {
    return new URL(value).hostname.split('.')[0];
  } catch {
    return null;
  }
}

export function validateQaTarget({ allowUnconfigured = false } = {}) {
  const url = process.env.QA_SUPABASE_URL?.trim();
  const projectRef = process.env.QA_PROJECT_REF?.trim();
  const actualRef = url ? projectRefFromUrl(url) : null;

  if (!url && !projectRef && allowUnconfigured) {
    return { configured: false, url: '' };
  }

  if (!url || !projectRef || !actualRef) {
    throw new Error('QA_SUPABASE_URL and QA_PROJECT_REF must both identify a dedicated QA project.');
  }
  if (projectRef !== actualRef) {
    throw new Error('QA_PROJECT_REF does not match the hostname in QA_SUPABASE_URL.');
  }
  if (!productionRef || projectRef === productionRef) {
    throw new Error('Refusing tests: the configured Supabase target is the production project.');
  }
  if (process.env.VITE_SUPABASE_URL && projectRefFromUrl(process.env.VITE_SUPABASE_URL) === productionRef) {
    throw new Error('Refusing tests: VITE_SUPABASE_URL points to production.');
  }

  return { configured: true, url };
}

export function hasRoleCredentials(role) {
  const credentials = {
    owner: ['QA_OWNER_EMAIL', 'QA_OWNER_PASSWORD'],
    admin: ['QA_ADMIN_EMAIL', 'QA_ADMIN_PASSWORD'],
    teacher: ['QA_TEACHER_ID', 'QA_TEACHER_PASSWORD'],
    student: ['QA_STUDENT_ID', 'QA_STUDENT_PASSWORD'],
  }[role];

  const target = validateQaTarget({ allowUnconfigured: true });
  return Boolean(target.configured && credentials && credentials.every((name) => process.env[name]?.trim()));
}