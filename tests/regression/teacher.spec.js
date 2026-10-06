import { test, expect } from '@playwright/test';

// Teacher regression: real UI login, assigned views render, admin-only areas absent.
const TEACHER = { id: 'TCH-26-0001', pw: 'TeacherPass@123' };

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

async function teacherLogin(page) {
  await page.goto('/login');
  await page.getByRole('button', { name: 'Teacher', exact: true }).click();
  await page.fill('input[name="identifier"]', TEACHER.id);
  await page.fill('input[type="password"]', TEACHER.pw);
  await page.click('button[type="submit"]');
  await page.waitForURL((url) => !url.pathname.startsWith('/login'), { timeout: 20000 });
}

test('teacher dashboard + teaching views render', async ({ page }) => {
  test.setTimeout(90000);
  const watch = watchApi(page);
  await teacherLogin(page);
  await expect(page).toHaveURL(/teacher/);
  for (const route of ['/timetable', '/attendance', '/homework', '/study-material', '/tests']) {
    await page.goto(route);
    await expect(page.locator('body')).not.toContainText('Failed to fetch', { timeout: 15000 });
  }
  expect(watch.failures, JSON.stringify(watch.failures)).toEqual([]);
});

test('teacher has no admin navigation', async ({ page }) => {
  test.setTimeout(60000);
  await teacherLogin(page);
  const nav = await page.locator('aside nav, nav').first().innerText().catch(() => '');
  expect(nav).not.toMatch(/payroll/i);
  expect(nav).not.toMatch(/finance.*p&l|p&l/i);
  // Direct URL to admin-only payroll must not render data (redirect or denied)
  await page.goto('/payroll');
  await expect(page.locator('body')).not.toContainText(/process salary payout/i, { timeout: 15000 });
});
