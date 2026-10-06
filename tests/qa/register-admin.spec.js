/**
 * Runtime tests for the public "Register as Admin" onboarding flow.
 *
 * Everything here runs against the disposable QA Supabase project selected by
 * QA_SUPABASE_URL / QA_PROJECT_REF (playwright.config.js refuses to start if
 * that target is production). Assertions that a record exists are made by
 * reading the QA database with the service-role key — never by inspecting
 * source code — so a test cannot pass merely because the UI rendered.
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { createRequire } from 'node:module';
import { expect, test } from '@playwright/test';

const require = createRequire(new URL('../../package.json', import.meta.url));
const { createClient } = require('@supabase/supabase-js');

const QA_DIR = path.join(os.tmpdir(), 'edupilot_e2e', 'qa');
const fixtures = JSON.parse(readFileSync(path.join(QA_DIR, 'fixtures.json'), 'utf8'));
const QA_URL = process.env.QA_SUPABASE_URL;
const QA_ANON = process.env.QA_SUPABASE_ANON_KEY;
const QA_SERVICE = process.env.QA_SUPABASE_SERVICE_ROLE_KEY;

/** Read-only ground truth against QA. */
const db = createClient(QA_URL, QA_SERVICE, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function countInstitutes() {
  const { count, error } = await db.from('institutes').select('*', { count: 'exact', head: true });
  if (error) throw error;
  return count;
}

async function adminClientFor(email, password) {
  const client = createClient(QA_URL, QA_ANON, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw new Error(`sign-in failed for ${email}: ${error.message}`);
  return client;
}

/**
 * Unique per test run: a re-run must exercise a genuinely new registration
 * instead of tripping the duplicate-email guard against the previous run's
 * records.
 */
const RUN = `${Date.now().toString(36)}${Math.floor(Math.random() * 1e4)}`;

const FILL = {
  instituteName: 'Honest Bear Academy',
  instituteEmail: `hello.${RUN}@honestbear.example`,
  contactNumber: '9777777777',
  instituteAddress: '11 Honesty Lane, Pune, MH',
  fullName: 'Honest Bear Admin',
  adminEmail: `honest.bear.admin.${RUN}@example.com`,
  password: 'HonestPass123',
  confirmPassword: 'HonestPass123',
};

async function fillRegistration(page, overrides = {}) {
  const values = { ...FILL, ...overrides };
  await page.getByLabel('Institute Name').fill(values.instituteName);
  await page.getByLabel('Institute Email').fill(values.instituteEmail);
  await page.getByLabel('Contact Number').fill(values.contactNumber);
  await page.getByLabel('Institute Address').fill(values.instituteAddress);
  await page.getByLabel('Full Name').fill(values.fullName);
  await page.getByLabel('Admin Email').fill(values.adminEmail);
  await page.getByLabel('Password', { exact: true }).fill(values.password);
  await page.getByLabel('Confirm Password').fill(values.confirmPassword);
}

/** Counts how many times the provisioning endpoint was actually called. */
function trackRegistrationCalls(page) {
  const tracker = { count: 0 };
  page.on('request', (request) => {
    if (request.url().includes('/functions/v1/register-institute')) tracker.count += 1;
  });
  return tracker;
}

/** Captured by the happy-path test and reused by later assertions. */
const created = { instituteId: null, userId: null };

test.describe('Public institute registration', () => {
  test('login page keeps all three options and offers Register as Admin under Admin', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByRole('heading', { name: 'EduPilot Portal' })).toBeVisible();

    for (const tab of ['Student', 'Teacher', 'Admin']) {
      await expect(page.getByRole('button', { name: tab, exact: true })).toBeVisible();
    }

    // Link exists only beneath the Admin form.
    await expect(page.getByTestId('register-admin-link')).toHaveCount(0);
    await page.getByRole('button', { name: 'Admin', exact: true }).click();
    await expect(page.getByTestId('register-admin-link')).toHaveText('New to EduPilot? Register as Admin');

    // No subscription / payment affordance anywhere on the page.
    const body = await page.locator('body').innerText();
    expect(body.toLowerCase()).not.toMatch(/subscribe|pricing|buy now|payment method/);
  });

  test('the link opens the registration page with both form sections', async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('button', { name: 'Admin', exact: true }).click();
    await page.getByTestId('register-admin-link').click();

    await expect(page).toHaveURL(/\/register-admin$/);
    await expect(page.getByRole('heading', { name: 'Create your institute' })).toBeVisible();

    for (const label of [
      'Institute Name', 'Institute Email', 'Contact Number', 'Institute Address',
      'Full Name', 'Admin Email', 'Password', 'Confirm Password',
    ]) {
      await expect(page.getByLabel(label, { exact: true })).toBeVisible();
    }
    await expect(page.getByText('Institute Details')).toBeVisible();
    await expect(page.getByText('First Admin Details')).toBeVisible();
  });

  test('empty submission is rejected client-side without calling the backend', async ({ page }) => {
    await page.goto('/register-admin');
    const tracker = trackRegistrationCalls(page);

    await page.getByRole('button', { name: 'Register as Admin' }).click();

    await expect(page.getByText('Institute name is required')).toBeVisible();
    await expect(page.getByText('Institute email is required')).toBeVisible();
    await expect(page.getByText('Contact number is required')).toBeVisible();
    await expect(page.getByText('Institute address is required')).toBeVisible();
    await expect(page.getByText('Full name is required')).toBeVisible();
    await expect(page.getByText('Admin email is required')).toBeVisible();
    await expect(page.getByText('Password is required')).toBeVisible();
    await expect(page.getByText('Please confirm your password')).toBeVisible();

    expect(tracker.count).toBe(0);
  });

  test('mismatched passwords are rejected client-side without calling the backend', async ({ page }) => {
    await page.goto('/register-admin');
    const tracker = trackRegistrationCalls(page);

    await fillRegistration(page, { confirmPassword: 'TotallyDifferent1' });
    await page.getByRole('button', { name: 'Register as Admin' }).click();

    await expect(page.getByText('Passwords do not match')).toBeVisible();
    expect(tracker.count).toBe(0);
  });

  test('a new institute, its first Auth account and its Admin profile are created', async ({ page }) => {
    const before = await countInstitutes();

    await page.goto('/register-admin');
    await fillRegistration(page);
    await page.getByRole('button', { name: 'Register as Admin' }).click();

    await expect(page.getByRole('heading', { name: 'Registration successful' })).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText(FILL.adminEmail, { exact: true })).toBeVisible();

    // --- ground truth: read the QA database with the service-role key ---
    const { data: institute, error: instErr } = await db
      .from('institutes')
      .select('id, name, email, phone, address, owner_name, owner_user_id')
      .eq('email', FILL.instituteEmail);
    expect(instErr).toBeNull();
    expect(institute).toHaveLength(1);
    expect(institute[0].name).toBe(FILL.instituteName);
    expect(institute[0].phone).toBe(FILL.contactNumber);
    expect(institute[0].address).toBe(FILL.instituteAddress);
    expect(institute[0].owner_name).toBe(FILL.fullName);

    const { data: authUsers, error: authErr } = await db.auth.admin.listUsers();
    expect(authErr).toBeNull();
    const authUser = authUsers.users.find((u) => u.email === FILL.adminEmail);
    expect(authUser, 'Auth user must exist').toBeTruthy();
    expect(authUser.email_confirmed_at, 'admin must sign in immediately').toBeTruthy();

    const { data: profile, error: profErr } = await db
      .from('profiles')
      .select('id, full_name, email, role, status, institute_id')
      .eq('email', FILL.adminEmail);
    expect(profErr).toBeNull();
    expect(profile).toHaveLength(1);
    expect(profile[0].id).toBe(authUser.id);   // profile UUID == auth UUID
    expect(profile[0].role).toBe('admin');     // assigned server-side
    expect(profile[0].status).toBe('Active');
    expect(profile[0].institute_id).toBe(institute[0].id);
    expect(profile[0].full_name).toBe(FILL.fullName);
    expect(institute[0].owner_user_id).toBe(authUser.id);

    expect(await countInstitutes()).toBe(before + 1);

    created.instituteId = institute[0].id;
    created.userId = authUser.id;
  });

  test('the new Admin signs in through the existing Admin login and sees their institute', async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('button', { name: 'Admin', exact: true }).click();
    await page.getByLabel('Institute Admin Email').fill(FILL.adminEmail);
    await page.getByLabel('Password', { exact: true }).fill(FILL.password);
    await page.getByRole('button', { name: 'Sign in as Admin' }).click();

    await expect(page).toHaveURL(/\/dashboard$/, { timeout: 30_000 });
    await expect(page.getByRole('heading', { name: 'Command center' })).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText(FILL.instituteName)).toBeVisible();
    await expect(page.getByText('Account Configuration Error')).toHaveCount(0);
    await expect(page.getByText('Institute not found')).toHaveCount(0);
  });

  test("the new Admin's session is scoped to their own institute only", async () => {
    // Ground truth first: isolation only proves something if QA really holds
    // more than one tenant and these accounts really exist in the database.
    const { data: allTenants, error: allErr } = await db.from('institutes').select('id, name');
    expect(allErr).toBeNull();
    expect(allTenants.length).toBeGreaterThanOrEqual(2);
    expect(allTenants.map((t) => t.id)).toContain(created.instituteId);

    const { data: ownProfile } = await db
      .from('profiles')
      .select('id, email, institute_id, role, status')
      .eq('email', FILL.adminEmail);
    expect(ownProfile).toHaveLength(1);
    expect(ownProfile[0].institute_id).toBe(created.instituteId);
    expect(ownProfile[0].role).toBe('admin');
    expect(ownProfile[0].status).toBe('Active');

    const { data: tenantAProfiles } = await db
      .from('profiles')
      .select('id, email, institute_id')
      .eq('institute_id', fixtures.tenantA);
    expect(tenantAProfiles.length).toBeGreaterThan(0);

    const client = await adminClientFor(FILL.adminEmail, FILL.password);

    const { data: institutes, error: iErr } = await client.from('institutes').select('id, name');
    expect(iErr).toBeNull();
    expect(institutes).toHaveLength(1);
    expect(institutes[0].id).toBe(created.instituteId);

    const { data: profiles, error: pErr } = await client.from('profiles').select('id, email, institute_id');
    expect(pErr).toBeNull();
    expect(profiles.length).toBeGreaterThan(0);
    expect(profiles.every((row) => row.institute_id === created.instituteId)).toBe(true);
    expect(profiles.some((row) => row.email === fixtures.tenantAAdmin.email)).toBe(false);

    // The other tenant must not be able to reach this institute at all.
    const rival = await adminClientFor(fixtures.tenantBAdmin.email, fixtures.tenantBAdmin.password);
    const { data: rivalSees } = await rival
      .from('institutes').select('id, name').eq('id', created.instituteId);
    expect(rivalSees).toHaveLength(0);
    const { data: rivalProfiles } = await rival
      .from('profiles').select('id, email').eq('institute_id', created.instituteId);
    expect(rivalProfiles).toHaveLength(0);
  });

  test('a duplicate registration is rejected safely and changes nothing', async ({ page }) => {
    const before = await countInstitutes();

    await page.goto('/register-admin');
    await fillRegistration(page, {
      instituteName: 'Duplicate Attempt Institute',
      instituteEmail: 'duplicate@honestbear.example',
    });
    await page.getByRole('button', { name: 'Register as Admin' }).click();

    await expect(page.getByRole('alert')).toContainText(
      'An account with this email already exists.',
      { timeout: 20_000 },
    );
    await expect(page).toHaveURL(/\/register-admin$/);
    expect(await countInstitutes()).toBe(before);
  });

  test('existing Student, Teacher and Admin logins still work', async ({ page }) => {
    // Teacher
    await page.goto('/login');
    await page.getByRole('button', { name: 'Teacher', exact: true }).click();
    await page.getByLabel('Teacher ID').fill(fixtures.teacher.idCode);
    await page.getByLabel('Password', { exact: true }).fill(fixtures.teacher.password);
    await page.getByRole('button', { name: 'Sign in as Teacher' }).click();
    await expect(page).toHaveURL(/\/teacher$/, { timeout: 30_000 });
    await page.evaluate(() => { window.localStorage.clear(); window.sessionStorage.clear(); });

    // Student
    await page.goto('/login');
    await page.getByRole('button', { name: 'Student', exact: true }).click();
    await page.getByLabel('Student ID').fill(fixtures.student.idCode);
    await page.getByLabel('Password', { exact: true }).fill(fixtures.student.password);
    await page.getByRole('button', { name: 'Sign in as Student' }).click();
    await expect(page).toHaveURL(/\/student$/, { timeout: 30_000 });
    await page.evaluate(() => { window.localStorage.clear(); window.sessionStorage.clear(); });

    // Pre-existing institute admin (tenant A)
    await page.goto('/login');
    await page.getByRole('button', { name: 'Admin', exact: true }).click();
    await page.getByLabel('Institute Admin Email').fill(fixtures.tenantAAdmin.email);
    await page.getByLabel('Password', { exact: true }).fill(fixtures.tenantAAdmin.password);
    await page.getByRole('button', { name: 'Sign in as Admin' }).click();
    await expect(page).toHaveURL(/\/dashboard$/, { timeout: 30_000 });
    await expect(page.getByRole('heading', { name: 'Command center' })).toBeVisible();
  });
});

