/**
 * QA fixture seeder for public institute registration.
 *
 * Creates the disposable tenants/accounts the §7 runtime tests need, entirely
 * inside the QA Supabase project (ref in QA_REF). Nothing here touches the
 * production project.
 *
 * Fixtures produced:
 *   1. A second tenant ("Rival QA Institute") registered through the public
 *      register-institute endpoint, so cross-institute isolation has something
 *      to be isolated *from*.
 *   2. A teacher and a student inside the first tenant, with the deterministic
 *      @edupilot.internal addresses that loginWithIdentifier() derives from
 *      TCH-26-0001 / STU-26-0001.
 */
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const require = createRequire('C:/Users/Atharva/Desktop/edu/package.json');
const { createClient } = require('@supabase/supabase-js');

const QA_DIR = path.join(os.tmpdir(), 'edupilot_e2e', 'qa');
const REF = fs.readFileSync(path.join(QA_DIR, 'ref.txt'), 'utf8').trim();
const URL_ = fs.readFileSync(path.join(QA_DIR, 'url.txt'), 'utf8').trim();
const ANON = fs.readFileSync(path.join(QA_DIR, 'anon.txt'), 'utf8').trim();
const SERVICE = fs.readFileSync(path.join(QA_DIR, 'service.txt'), 'utf8').trim();

const admin = createClient(URL_, SERVICE, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const results = [];
const record = (id, ok, detail) => {
  results.push(ok);
  console.log(`[${ok ? 'PASS' : 'FAIL'}] ${id}${detail !== undefined ? ' :: ' + detail : ''}`);
};

/**
 * Registers a tenant through the public endpoint. On a re-run the email is
 * already taken (409), so the existing institute is resolved and reused
 * instead of failing — the seeder stays idempotent.
 */
async function ensureTenant({ label, payload, promoteOwner = false }) {
  const res = await fetch(`${URL_}/functions/v1/register-institute`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: ANON, Authorization: `Bearer ${ANON}` },
    body: JSON.stringify(payload),
  });
  const body = await res.json().catch(() => ({}));

  if (res.status === 201) {
    record(`SEED_${label}`, true, `created institute=${body.instituteId}`);
    if (promoteOwner) {
      const { error } = await admin.from('profiles').update({ role: 'owner' }).eq('id', body.userId);
      if (error) record(`SEED_${label}_owner_promote`, false, error.message);
      else record(`SEED_${label}_owner_promote`, true, 'role=admin -> owner');
    }
    return body.instituteId;
  }

  const { data, error } = await admin
    .from('profiles')
    .select('id, institute_id')
    .eq('email', payload.adminEmail)
    .maybeSingle();
  if (error || !data) {
    record(`SEED_${label}`, false, `status=${res.status} ${JSON.stringify(body)}`);
    return null;
  }
  record(`SEED_${label}`, true, `reused existing institute=${data.institute_id}`);
  if (promoteOwner) {
    const { error: promoteErr } = await admin.from('profiles').update({ role: 'owner' }).eq('id', data.id);
    if (promoteErr) record(`SEED_${label}_owner_promote`, false, promoteErr.message);
  }
  return data.institute_id;
}

async function seedRoleUser({ label, email, password, role, instituteId, extra }) {
  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (createErr) {
    record(`SEED_${label}_auth`, false, createErr.message);
    return null;
  }
  const userId = created.user.id;

  const { error: profileErr } = await admin.from('profiles').insert({
    id: userId,
    institute_id: instituteId,
    full_name: extra.fullName,
    email,
    role,
    status: 'Active',
  });
  if (profileErr) {
    record(`SEED_${label}_profile`, false, profileErr.message);
    return null;
  }

  const { error: rowErr } = await admin.from(extra.table).insert({
    institute_id: instituteId,
    user_id: userId,
    ...extra.payload,
  });
  if (rowErr) {
    record(`SEED_${label}_row`, false, rowErr.message);
    return null;
  }

  record(`SEED_${label}`, true, `userId=${userId} role=${role} institute=${instituteId}`);
  return userId;
}

const main = async () => {
  const first = JSON.parse(fs.readFileSync(path.join(QA_DIR, 'first_registration.json'), 'utf8'));
  const tenantA = first.instituteId;
  console.log(`QA project: ${REF}`);
  console.log(`Tenant A:   ${tenantA}`);

  const tenantB = await ensureTenant({
    label: 'second_tenant',
    payload: {
      instituteName: 'Rival QA Institute',
      instituteEmail: 'contact@rival-qa.example',
      contactNumber: '9222222222',
      instituteAddress: '7 Rival Road, Pune, MH',
      fullName: 'Rival Admin',
      adminEmail: 'rival.admin@rival-qa.example',
      password: 'QApassword123',
      confirmPassword: 'QApassword123',
    },
  });


  await seedRoleUser({
    label: 'teacher_tenantA',
    email: 'tch_26_0001@edupilot.internal',
    password: 'QATeacherPass123',
    role: 'teacher',
    instituteId: tenantA,
    extra: {
      fullName: 'QA Teacher One',
      table: 'teachers',
      payload: { full_name: 'QA Teacher One', teacher_id_code: 'TCH-26-0001', status: 'Active' },
    },
  });

  await seedRoleUser({
    label: 'student_tenantA',
    email: 'stu_26_0001@edupilot.internal',
    password: 'QAStudentPass123',
    role: 'student',
    instituteId: tenantA,
    extra: {
      fullName: 'QA Student One',
      table: 'students',
      payload: { full_name: 'QA Student One', student_id_code: 'STU-26-0001', status: 'Active' },
    },
  });

  fs.writeFileSync(
    path.join(QA_DIR, 'fixtures.json'),
    JSON.stringify(
      {
        project: REF,
        tenantA,
        tenantB: tenantB ?? null,
        tenantAAdmin: { email: 'first.admin@qa-isolated.example', password: 'QApassword123' },
        tenantBAdmin: { email: 'rival.admin@rival-qa.example', password: 'QApassword123' },
        teacher: { idCode: 'TCH-26-0001', password: 'QATeacherPass123' },
        student: { idCode: 'STU-26-0001', password: 'QAStudentPass123' },
      },
      null,
      2,
    ),
  );
  console.log('fixtures.json written');

  const failed = results.filter((r) => !r).length;
  console.log(`===== SEED ${results.length - failed}/${results.length} passed =====`);
  process.exit(failed ? 1 : 0);
};

main().catch((err) => {
  console.error('SEED ERROR', err);
  process.exit(1);
});
