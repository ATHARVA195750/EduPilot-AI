/**
 * P3 — Student batch assignment + My Timetable verification (real Chromium).
 *
 * Part 1: Admin uses the EXISTING Edit Student UI to assign STU-26-0002
 *         (batch_id was NULL) to Batch 10A Morning, then verifies persistence
 *         through the API response the UI relies on.
 * Part 2: Student opens My Timetable — the single existing schedule must
 *         appear EXACTLY ONCE, before and after a full refresh.
 *
 * No frontend deduplication, no timetable rule changes — pure verification.
 *
 * Run: npx playwright test --config playwright.e2e.config.js stabilization_p3.spec.js
 */
import { test, expect } from '@playwright/test';

const ADMIN = { mode: 'Admin', id: 'admin@qainstitute.com', pw: 'AdminPass@123' };
const STUDENT = { mode: 'Student', id: 'STU-26-0001', pw: 'StudentPass@123' };
const BATCH_10A_ID = '762a439e-e72f-4e38-bbe0-dda8e8de0b56'; // Batch 10A Morning (owns the only schedule)

async function login(page, acct) {
  await page.goto('/login');
  await page.getByRole('button', { name: acct.mode, exact: true }).click();
  if (acct.mode === 'Admin') {
    await page.fill('input[type="email"]', acct.id);
  } else {
    await page.fill('input[name="identifier"]', acct.id);
  }
  await page.fill('input[type="password"]', acct.pw);
  await page.click('button[type="submit"]');
  await page.waitForURL((url) => !url.pathname.startsWith('/login'), { timeout: 20000 });
}

test('P3a admin assigns STU-26-0002 to a batch via the existing Edit UI', async ({ page }) => {
  test.setTimeout(90000);

  await login(page, ADMIN);
  await page.goto('/students');
  await expect(page.getByRole('heading', { name: 'Student Directory & Roster' })).toBeVisible({ timeout: 15000 });

  // Narrow the list if a search box exists
  const search = page.getByPlaceholder(/search/i).first();
  if (await search.count()) {
    await search.fill('Test Student Bugfix');
    await page.waitForTimeout(500);
  }

  const row = page.locator('tr').filter({ hasText: 'Test Student Bugfix' }).first();
  await expect(row).toBeVisible({ timeout: 15000 });
  await row.getByRole('button', { name: 'Edit student' }).click();
  await page.waitForURL((url) => url.pathname.includes('/students/edit/'), { timeout: 15000 });

  // Existing UI: "Assigned Batch" select (react-hook-form name="batch_id")
  await page.selectOption('select[name="batch_id"]', BATCH_10A_ID);
  await page.getByRole('button', { name: 'Save Student Changes' }).click();

  // Successful save navigates to the student profile (/students/:id)
  await page.waitForURL(
    (url) => /\/students\/[^/]+$/.test(url.pathname) && !url.pathname.includes('/edit'),
    { timeout: 20000 },
  );
  await expect(page.locator('body')).not.toContainText('Unable to update student profile');
  await expect(page.locator('body')).not.toContainText('Failed to fetch');

  // Persistence proof through the same API the UI uses
  const token = await page.evaluate(() => sessionStorage.getItem('edupilot_token'));
  expect(token, 'no auth token in session').toBeTruthy();
  const res = await page.request.get('http://127.0.0.1:8000/api/v1/students', {
    headers: { Authorization: `Bearer ${token}` },
  });
  expect(res.ok()).toBeTruthy();
  const students = await res.json();
  const stu2 = students.find((s) => s.student_id_code === 'STU-26-0002');
  expect(stu2, 'STU-26-0002 not found').toBeTruthy();
  expect(String(stu2.batch_id)).toBe(BATCH_10A_ID);
  console.log('P3a OK — STU-26-0002 batch_id persisted via Edit UI:', stu2.batch_id);
});

test('P3b student My Timetable shows the schedule exactly once (and after refresh)', async ({ page }) => {
  test.setTimeout(90000);

  await login(page, STUDENT);
  await page.goto('/timetable');
  await expect(page.getByRole('heading', { name: 'My Timetable' })).toBeVisible({ timeout: 15000 });

  // The single existing schedule: Monday 18:00:00 - 19:30:00 (Batch 10A)
  const timeRows = page.locator('p').filter({ hasText: 'Time:' });
  await expect(page.getByText('Monday', { exact: true })).toBeVisible();
  await expect(timeRows).toHaveCount(1, { timeout: 15000 });
  await expect(timeRows.first()).toContainText('18:00:00 - 19:30:00');
  await expect(page.locator('body')).not.toContainText('Failed to fetch');
  console.log('P3b OK — schedule card count before refresh: 1');

  // Full refresh → must still be exactly one
  await page.reload();
  await expect(page.getByRole('heading', { name: 'My Timetable' })).toBeVisible({ timeout: 15000 });
  await expect(timeRows).toHaveCount(1, { timeout: 15000 });
  await expect(timeRows.first()).toContainText('18:00:00 - 19:30:00');
  await expect(page.locator('body')).not.toContainText('Failed to fetch');
  console.log('P3b OK — schedule card count after refresh: 1');
});
