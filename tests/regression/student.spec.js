import { test, expect } from '@playwright/test';

// Student regression: real UI login, portal views render, admin/finance absent.
const STUDENT = { id: 'STU-26-0001', pw: 'StudentPass@123' };

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

async function studentLogin(page) {
  await page.goto('/login');
  await page.getByRole('button', { name: 'Student', exact: true }).click();
  await page.fill('input[name="identifier"]', STUDENT.id);
  await page.fill('input[type="password"]', STUDENT.pw);
  await page.click('button[type="submit"]');
  await page.waitForURL((url) => !url.pathname.startsWith('/login'), { timeout: 20000 });
}

test('student dashboard + portal views render', async ({ page }) => {
  test.setTimeout(120000);
  const watch = watchApi(page);
  await studentLogin(page);
  await expect(page).toHaveURL(/student/);
  for (const route of ['/timetable', '/attendance', '/study-material', '/results', '/fees']) {
    await page.goto(route);
    await expect(page.locator('body')).not.toContainText('Failed to fetch', { timeout: 15000 });
  }
  expect(watch.failures, JSON.stringify(watch.failures)).toEqual([]);
});

test('student has no admin/finance access', async ({ page }) => {
  test.setTimeout(60000);
  await studentLogin(page);
  const nav = await page.locator('aside nav, nav').first().innerText().catch(() => '');
  expect(nav).not.toMatch(/payroll/i);
  await page.goto('/payroll');
  await expect(page.locator('body')).not.toContainText(/process salary payout/i, { timeout: 15000 });
});
