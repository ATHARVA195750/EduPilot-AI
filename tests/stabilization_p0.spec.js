/**
 * P0 STABILIZATION SUITE — Browser verification of the login chain
 *   Browser → Vite frontend (localhost:5173) → FastAPI (127.0.0.1:8000).
 *
 * Evidence rules: these tests run a REAL Chromium browser and assert on
 * user-visible outcomes (URLs, rendered text) plus the actual network layer
 * (request failures to the API, CORS/console errors). They do NOT count as
 * verification if run without the backend + frontend actually serving.
 *
 * Run:
 *   npx playwright test --config playwright.e2e.config.js stabilization_p0.spec.js
 */
import { test, expect } from '@playwright/test';

const ADMIN = { mode: 'Admin', id: 'admin@qainstitute.com', pw: 'AdminPass@123', home: '/dashboard' };
const TEACHER = { mode: 'Teacher', id: 'TCH-26-0001', pw: 'TeacherPass@123', home: '/teacher' };
const STUDENT = { mode: 'Student', id: 'STU-26-0001', pw: 'StudentPass@123', home: '/student' };

/** Track every API-layer failure so "Failed to fetch" can never pass silently. */
function watchApi(page) {
  const state = { failures: [], corsLike: [], okResponses: [], apiResponses: 0 };
  page.on('requestfailed', (req) => {
    if (/localhost:8000|127\.0\.0\.1:8000/.test(req.url())) {
      state.failures.push(`${req.method()} ${req.url()} :: ${req.failure()?.errorText}`);
    }
  });
  page.on('response', (res) => {
    if (/localhost:8000|127\.0\.0\.1:8000/.test(res.url())) {
      state.apiResponses += 1;
      if (res.status() < 400) state.okResponses.push(`${res.status()} ${res.url()}`);
      if (res.status() >= 500) state.failures.push(`HTTP ${res.status()} ${res.url()}`);
    }
  });
  page.on('console', (msg) => {
    if (msg.type() !== 'error') return;
    const t = msg.text();
    if (t.includes('CORS') || t.includes('127.0.0.1:8000') || t.includes('localhost:8000')) {
      state.corsLike.push(t);
    }
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

function assertHealthy(state, { requireOkResponse = true } = {}) {
  expect(state.failures, `API request failures: ${JSON.stringify(state.failures, null, 2)}`).toEqual([]);
  expect(state.corsLike, `CORS/console API errors: ${JSON.stringify(state.corsLike, null, 2)}`).toEqual([]);
  expect(state.apiResponses, 'no API responses at all reached the browser from :8000').toBeGreaterThan(0);
  if (requireOkResponse) {
    expect(state.okResponses.length, 'no successful API responses observed from the browser').toBeGreaterThan(0);
  }
}

test.describe('P0 login stabilization (real browser)', () => {
  test('P0-TEST1 admin browser login', async ({ page }) => {
    test.setTimeout(60000);
    const watch = watchApi(page);

    await uiLogin(page, ADMIN);

    expect(new URL(page.url()).pathname).toBe('/dashboard');
    await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
    await expect(page.locator('aside nav')).toBeVisible();
    await expect(page.locator('body')).not.toContainText('Failed to fetch');
    assertHealthy(watch);
    console.log('TEST1 OK — admin dashboard rendered; API responses:', watch.okResponses.length);
  });

  test('P0-TEST1b login error path reaches backend from browser', async ({ page }) => {
    test.setTimeout(60000);
    const watch = watchApi(page);

    await page.goto('/login');
    await page.getByRole('button', { name: 'Admin', exact: true }).click();
    await page.fill('input[type="email"]', 'admin@qainstitute.com');
    await page.fill('input[type="password"]', 'DefinitelyWrongPass@123');
    await page.click('button[type="submit"]');

    // Server-generated detail proves the request crossed Browser → Vite → FastAPI
    // and came back (a dead backend would surface "Failed to fetch" instead).
    await expect(page.locator('body')).toContainText('Invalid email or password', { timeout: 15000 });
    await expect(page.locator('body')).not.toContainText('Failed to fetch');
    expect(page.url()).toContain('/login');
    // The HTTP 400 body from FastAPI is the proof of connectivity here.
    assertHealthy(watch, { requireOkResponse: false });
    console.log('TEST1b OK — backend-generated 400 detail rendered in browser');
  });

  test('P0-TEST4 teacher browser login', async ({ page }) => {
    test.setTimeout(60000);
    const watch = watchApi(page);

    await uiLogin(page, TEACHER);

    expect(new URL(page.url()).pathname).toBe('/teacher');
    await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
    await expect(page.locator('body')).not.toContainText('Failed to fetch');
    assertHealthy(watch);
    console.log('TEST4 OK — teacher dashboard rendered');
  });

  test('P0-TEST5 student browser login', async ({ page }) => {
    test.setTimeout(60000);
    const watch = watchApi(page);

    await uiLogin(page, STUDENT);

    expect(new URL(page.url()).pathname).toBe('/student');
    await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
    await expect(page.locator('body')).not.toContainText('Failed to fetch');
    assertHealthy(watch);
    console.log('TEST5 OK — student dashboard rendered');
  });

  test('P0-TEST6 refresh authenticated dashboard', async ({ page }) => {
    test.setTimeout(60000);
    const watch = watchApi(page);

    await uiLogin(page, ADMIN);
    expect(new URL(page.url()).pathname).toBe('/dashboard');

    // Full browser refresh — session must survive via /auth/me revalidation.
    await page.reload();
    await page.waitForURL((url) => !url.pathname.startsWith('/login'), { timeout: 20000 });
    await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
    expect(new URL(page.url()).pathname).toBe('/dashboard');
    await expect(page.locator('aside nav')).toBeVisible();
    await expect(page.locator('body')).not.toContainText('Failed to fetch');
    assertHealthy(watch);
    console.log('TEST6 OK — session survived full refresh');
  });

  test('P0-TEST7 logout then login again', async ({ page }) => {
    test.setTimeout(60000);
    const watch = watchApi(page);

    await uiLogin(page, ADMIN);
    expect(new URL(page.url()).pathname).toBe('/dashboard');

    await page.getByRole('button', { name: /sign out/i }).click();
    await page.waitForURL((url) => url.pathname.startsWith('/login'), { timeout: 20000 });
    expect(page.url()).toContain('/login');
    // Token must be gone: direct dashboard access redirects back to login.
    await page.goto('/dashboard');
    await page.waitForURL((url) => url.pathname.startsWith('/login'), { timeout: 20000 });

    await uiLogin(page, ADMIN);
    expect(new URL(page.url()).pathname).toBe('/dashboard');
    await expect(page.locator('body')).not.toContainText('Failed to fetch');
    assertHealthy(watch);
    console.log('TEST7 OK — logout cleared session; second login succeeded');
  });

  test('P0-RBAC student blocked from admin payroll route', async ({ page }) => {
    test.setTimeout(60000);
    const watch = watchApi(page);

    await uiLogin(page, STUDENT);
    await page.goto('/payroll');
    // ProtectedRoute must bounce the student to their own dashboard
    // (wait for the actual redirect, not merely "not login").
    await page.waitForURL((url) => url.pathname === '/student', { timeout: 20000 });
    expect(new URL(page.url()).pathname).toBe('/student');
    await expect(page.locator('body')).not.toContainText('Failed to fetch');
    assertHealthy(watch);
    console.log('RBAC OK — student redirected away from /payroll');
  });
});
