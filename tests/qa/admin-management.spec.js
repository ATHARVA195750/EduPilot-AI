import { expect, test } from '../fixtures/rolePages.js';

function newQaEmail() {
  return `qa-admin-${Date.now()}-${Math.random().toString(36).slice(2, 7)}@example.com`;
}

test('owner creates a scoped Admin, duplicate email is rejected, and the new account can sign in', async ({ ownerPage, qaData }) => {
  test.skip(!process.env.QA_NEW_ADMIN_PASSWORD, 'Set QA_NEW_ADMIN_PASSWORD locally in the dedicated QA environment.');
  const email = newQaEmail();
  const password = process.env.QA_NEW_ADMIN_PASSWORD;

  await ownerPage.goto('/admin-management');
  await expect(ownerPage.getByRole('heading', { name: 'Admin Management' })).toBeVisible();
  await ownerPage.getByLabel('Full Name').fill('QA Additional Admin');
  await ownerPage.getByLabel('Email').fill(email);
  await ownerPage.getByLabel('Password', { exact: true }).fill(password);
  await ownerPage.getByLabel('Confirm Password').fill(password);

  const createRequestPromise = ownerPage.waitForRequest((request) =>
    request.url().includes('/functions/v1/admin-provision-user') && request.method() === 'POST'
  );
  const createResponsePromise = ownerPage.waitForResponse((response) =>
    response.url().includes('/functions/v1/admin-provision-user') && response.request().method() === 'POST'
  );
  await ownerPage.getByRole('button', { name: 'Create Admin' }).click();
  const createRequest = await createRequestPromise;
  const requestBody = createRequest.postDataJSON();
  expect(Object.keys(requestBody).sort()).toEqual(['email', 'fullName', 'password', 'targetType']);
  expect(requestBody.targetType).toBe('admin');
  expect(requestBody.fullName).toBe('QA Additional Admin');
  expect(requestBody.email).toBe(email);
  expect(typeof requestBody.password).toBe('string');
  expect(requestBody.password.length).toBeGreaterThanOrEqual(8);
  const createResponse = await createResponsePromise;
  const result = await createResponse.json();
  if (result?.userId) qaData.trackQaAuthUser(result.userId);

  expect(createResponse.status()).toBe(201);
  expect(result.success).toBe(true);
  const profile = await qaData.selectQaRow('profiles', result.userId, process.env.QA_INSTITUTE_ID);
  expect(profile?.id).toBe(result.userId);
  expect(profile?.role).toBe('admin');
  expect(profile?.institute_id).toBe(process.env.QA_INSTITUTE_ID);
  await expect(ownerPage.getByRole('status')).toContainText(email);
  await expect(ownerPage.getByRole('listitem').filter({ hasText: email })).toHaveCount(1);

  await ownerPage.getByLabel('Full Name').fill('QA Duplicate Admin');
  await ownerPage.getByLabel('Email').fill(email);
  await ownerPage.getByLabel('Password', { exact: true }).fill(password);
  await ownerPage.getByLabel('Confirm Password').fill(password);
  await ownerPage.getByRole('button', { name: 'Create Admin' }).click();
  await ownerPage.getByLabel('Password', { exact: true }).fill('');
  await ownerPage.getByLabel('Confirm Password').fill('');
  await expect(ownerPage.getByRole('alert')).toContainText('already exists');
  await expect(ownerPage.getByRole('listitem').filter({ hasText: email })).toHaveCount(1);

  await ownerPage.getByRole('button', { name: 'Sign out' }).click();
  await expect(ownerPage).toHaveURL(/\/login$/);
  await ownerPage.getByRole('button', { name: 'Admin', exact: true }).click();
  await ownerPage.getByLabel('Institute Admin Email').fill(email);
  await ownerPage.getByLabel('Password').fill(password);
  await ownerPage.getByRole('button', { name: 'Sign in as Admin' }).click();
  await expect(ownerPage).toHaveURL(/\/dashboard$/);

  await ownerPage.goto('/admin-management');
  await expect(ownerPage).toHaveURL(/\/dashboard$/);
});

test('Admin cannot invoke server-side Admin provisioning', async ({ adminPage }) => {
  test.skip(!process.env.QA_SUPABASE_URL || !process.env.QA_SUPABASE_ANON_KEY, 'Dedicated QA Supabase environment is required.');

  const accessToken = await adminPage.evaluate(() => {
    const entry = Object.entries(localStorage).find(([key]) => key.endsWith('-auth-token'));
    return entry ? JSON.parse(entry[1])?.access_token : null;
  });
  expect(accessToken).toBeTruthy();

  const response = await adminPage.request.post(`${process.env.QA_SUPABASE_URL}/functions/v1/admin-provision-user`, {
    headers: {
      apikey: process.env.QA_SUPABASE_ANON_KEY,
      authorization: `Bearer ${accessToken}`,
    },
    data: {
      targetType: 'admin',
      fullName: 'Unauthorized QA Promotion Attempt',
      email: newQaEmail(),
      password: process.env.QA_NEW_ADMIN_PASSWORD || 'QA-only-not-used-123',
    },
  });

  expect(response.status()).toBe(403);
  await expect(response.json()).resolves.toMatchObject({ error: 'Only the institute owner can create Admin accounts.' });
});
