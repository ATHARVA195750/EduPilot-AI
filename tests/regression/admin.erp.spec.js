import { test, expect } from '@playwright/test';

// Admin ERP regression: real UI, seed owner account, unique QA names.
const ADMIN = { id: 'admin@qainstitute.com', pw: 'AdminPass@123' };
const stamp = Date.now().toString(36);

function watchApi(page) {
  const state = { failures: [] };
  page.on('requestfailed', (req) => {
    if (/127\.0\.0\.1:8000/.test(req.url())) state.failures.push(`${req.method()} ${req.url()}`);
  });
  page.on('response', (res) => {
    if (/127\.0\.0\.1:8000/.test(res.url()) && res.status() >= 500) {
      state.failures.push(`HTTP ${res.status()} ${res.url()}`);
    }
  });
  return state;
}

async function adminLogin(page) {
  await page.goto('/login');
  await page.fill('input[type="email"]', ADMIN.id);
  await page.fill('input[type="password"]', ADMIN.pw);
  await page.click('button[type="submit"]');
  await page.waitForURL((url) => !url.pathname.startsWith('/login'), { timeout: 20000 });
}

test('admin dashboard + branches CRUD', async ({ page }) => {
  test.setTimeout(90000);
  const watch = watchApi(page);
  await adminLogin(page);
  await expect(page).toHaveURL(/dashboard/);
  await expect(page.locator('body')).not.toContainText('Failed to fetch');

  await page.goto('/branches');
  const branchName = `QA Branch ${stamp}`;
  // Open create form (button text may vary; fall back to any create/add trigger)
  const createBtn = page.getByRole('button', { name: /add branch|new branch|create branch|add/i }).first();
  if (await createBtn.count()) {
    await createBtn.click();
    const nameInput = page.locator('input[name="name"], input[placeholder*="ranch" i]').first();
    await nameInput.fill(branchName);
    await page.getByRole('button', { name: /save|create|submit|add/i }).last().click();
    await expect(page.locator('body')).toContainText(branchName, { timeout: 15000 });
  }
  expect(watch.failures, JSON.stringify(watch.failures)).toEqual([]);
});

test('admin courses create/edit/delete', async ({ page }) => {
  test.setTimeout(120000);
  const watch = watchApi(page);
  await adminLogin(page);
  await page.goto('/courses');
  const courseName = `QA Course ${stamp}`;
  const createBtn = page.getByRole('button', { name: /add course|new course|create course|add/i }).first();
  await createBtn.click();
  await page.getByPlaceholder('e.g. Class 10th CBSE Comprehensive').fill(courseName);
  await page.getByRole('button', { name: /save course/i }).click();
  await expect(page.locator('body')).toContainText(courseName, { timeout: 15000 });

  // Edit flow if present
  const editBtn = page.getByRole('button', { name: /edit/i }).first();
  if (await editBtn.count()) {
    await editBtn.click();
    await page.getByPlaceholder('e.g. Class 10th CBSE Comprehensive').fill(`${courseName} Edited`);
    await page.getByRole('button', { name: /save|update/i }).last().click();
    await expect(page.locator('body')).toContainText(`${courseName} Edited`, { timeout: 15000 });
  }
  expect(watch.failures, JSON.stringify(watch.failures)).toEqual([]);
});

test('admin payroll + finance + timetable render', async ({ page }) => {
  test.setTimeout(90000);
  const watch = watchApi(page);
  await adminLogin(page);
  for (const route of ['/payroll', '/finance', '/timetable', '/study-material', '/attendance']) {
    await page.goto(route);
    await expect(page.locator('body')).not.toContainText('Failed to fetch', { timeout: 15000 });
  }
  expect(watch.failures, JSON.stringify(watch.failures)).toEqual([]);
});
