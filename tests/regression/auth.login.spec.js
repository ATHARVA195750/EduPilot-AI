import { test, expect } from '@playwright/test';

// Real-browser login regression: UI only, no JWT injection, no mocks.
const ACCOUNTS = [
  { mode: 'Admin', id: 'admin@qainstitute.com', pw: 'AdminPass@123', home: '/dashboard' },
  { mode: 'Teacher', id: 'TCH-26-0001', pw: 'TeacherPass@123', home: '/teacher' },
  { mode: 'Student', id: 'STU-26-0001', pw: 'StudentPass@123', home: '/student' },
];

function watchApi(page) {
  const state = { failures: [], corsLike: [], apiResponses: 0, ok: 0 };
  page.on('requestfailed', (req) => {
    if (/127\.0\.0\.1:8000/.test(req.url())) state.failures.push(`${req.method()} ${req.url()} :: ${req.failure()?.errorText}`);
  });
  page.on('response', (res) => {
    if (/127\.0\.0\.1:8000/.test(res.url())) {
      state.apiResponses += 1;
      if (res.status() < 400) state.ok += 1;
      if (res.status() >= 500) state.failures.push(`HTTP ${res.status()} ${res.url()}`);
    }
  });
  page.on('console', (msg) => {
    if (msg.type() !== 'error') return;
    const t = msg.text();
    if (/CORS|8000|Failed to fetch/i.test(t)) state.corsLike.push(t);
  });
  return state;
}

async function uiLogin(page, acct) {
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

test('login page defaults to Admin with correct tab order', async ({ page }) => {
  await page.goto('/login');
  const tabs = page.locator('div.mb-6.grid button');
  await expect(tabs.nth(0)).toContainText('Admin');
  await expect(tabs.nth(1)).toContainText('Teacher');
  await expect(tabs.nth(2)).toContainText('Student');
  await expect(page.locator('button[type="submit"]')).toContainText('Sign in as Admin');
});

for (const acct of ACCOUNTS) {
  test(`${acct.mode} UI login, refresh persistence, logout`, async ({ page }) => {
    test.setTimeout(90000);
    const watch = watchApi(page);
    await uiLogin(page, acct);
    expect(new URL(page.url()).pathname).toBe(acct.home);
    await expect(page.locator('body')).not.toContainText('Failed to fetch');

    // Refresh keeps authenticated state
    await page.reload();
    await page.waitForURL((url) => !url.pathname.startsWith('/login'), { timeout: 20000 });
    expect(new URL(page.url()).pathname).toBe(acct.home);

    expect(watch.failures, JSON.stringify(watch.failures)).toEqual([]);
    expect(watch.corsLike, JSON.stringify(watch.corsLike)).toEqual([]);
    expect(watch.apiResponses).toBeGreaterThan(0);

    // Logout returns to /login (logout control may be in sidebar or header menu)
    const logoutBtn = page.getByRole('button', { name: /log ?out|sign ?out/i });
    if (await logoutBtn.count()) {
      await logoutBtn.first().click();
      await expect(page).toHaveURL(/login/, { timeout: 15000 });
    }
  });
}

test('invalid credentials show useful error, stay on login', async ({ page }) => {
  await page.goto('/login');
  await page.fill('input[type="email"]', 'nobody@test.local');
  await page.fill('input[type="password"]', 'WrongPass123!');
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL(/login/);
  await expect(page.locator('body')).toContainText(/invalid/i);
});
