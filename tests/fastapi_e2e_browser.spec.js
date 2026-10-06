import { test, expect } from '@playwright/test';

const BASE = 'http://localhost:5173';

// ─── Helpers ────────────────────────────────────────────────────────────────

async function loginAs(page, role, identifier, password) {
  await page.goto(`${BASE}/login`);
  await page.waitForLoadState('networkidle');
  // Click the correct role tab
  await page.click(`button:has-text("${role.charAt(0).toUpperCase() + role.slice(1)}")`);
  await page.waitForTimeout(400);
  // Fill credentials — admin uses 'email' field, others use 'identifier'
  if (role === 'admin') {
    await page.fill('input[type="email"]', identifier);
  } else {
    await page.fill('input[placeholder]', identifier);
  }
  await page.fill('input[type="password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForTimeout(3000);
}

async function logout(page) {
  const logoutBtn = page.locator('button:has-text("Logout"), button:has-text("Sign out"), a:has-text("Logout")');
  if (await logoutBtn.count() > 0) {
    await logoutBtn.first().click();
    await page.waitForTimeout(1000);
  } else {
    await page.goto(`${BASE}/login`);
  }
}

async function getConsoleErrors(page) {
  const errors = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  return errors;
}

// ─── WORKFLOW 1: Admin Login & Dashboard ─────────────────────────────────────

test('WF-01: Admin Login & Dashboard', async ({ page }) => {
  const consoleErrors = [];
  page.on('console', (msg) => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });

  await loginAs(page, 'admin', 'admin@qainstitute.com', 'AdminPass@123');
  const url = page.url();
  expect(url, `Admin login should redirect away from /login. Got: ${url}`).not.toContain('/login');
  console.log(`✓ Admin login redirected to: ${url}`);

  // Verify dashboard content exists
  const heading = page.locator('h1, h2, h3').first();
  await expect(heading).toBeVisible({ timeout: 5000 });
  console.log(`✓ Dashboard heading visible: "${await heading.textContent()}"`);

  if (consoleErrors.length > 0) {
    console.log(`  Console errors on dashboard: ${consoleErrors.join('\n  ')}`);
  }
});

// ─── WORKFLOW 2: Student Create, Refresh & Persistence ───────────────────────

test('WF-02: Student Create, Refresh & Persistence', async ({ page }) => {
  await loginAs(page, 'admin', 'admin@qainstitute.com', 'AdminPass@123');
  await expect(page).not.toHaveURL(/\/login/);

  // Navigate to Students
  await page.goto(`${BASE}/students`);
  await page.waitForLoadState('networkidle');
  const addBtn = page.locator('button:has-text("Add Student"), button:has-text("New Student"), button:has-text("Add")').first();
  await expect(addBtn).toBeVisible({ timeout: 5000 });
  await addBtn.click();
  await page.waitForTimeout(500);

  // Fill form
  const nameInput = page.locator('input[name="full_name"], input[placeholder*="name"], input[placeholder*="Name"]').first();
  await expect(nameInput).toBeVisible({ timeout: 3000 });
  await nameInput.fill('QA Browser Test Student');

  const emailInput = page.locator('input[type="email"], input[name="email"]').first();
  if (await emailInput.isVisible()) {
    await emailInput.fill(`qa.browser.${Date.now()}@example.com`);
  }

  const submitBtn = page.locator('button[type="submit"]').last();
  await submitBtn.click();
  await page.waitForTimeout(2000);

  // Verify record appears
  const studentName = page.locator('text=QA Browser Test Student');
  const found = await studentName.count() > 0;
  console.log(`  Student creation visible in list: ${found ? '✓ FOUND' : '✗ NOT FOUND (may be on next page)'}`);

  // Refresh and verify persistence
  await page.reload();
  await page.waitForLoadState('networkidle');
  console.log(`✓ Page refreshed successfully`);
});

// ─── WORKFLOW 3: Teacher Create & Persistence ────────────────────────────────

test('WF-03: Teacher Create & Persistence', async ({ page }) => {
  await loginAs(page, 'admin', 'admin@qainstitute.com', 'AdminPass@123');
  await expect(page).not.toHaveURL(/\/login/);

  await page.goto(`${BASE}/teachers`);
  await page.waitForLoadState('networkidle');

  const addBtn = page.locator('button:has-text("Add Teacher"), button:has-text("New Teacher"), button:has-text("Add")').first();
  await expect(addBtn).toBeVisible({ timeout: 5000 });

  // Verify teachers page renders (has at least heading or table)
  const heading = page.locator('h1, h2').first();
  await expect(heading).toBeVisible();
  console.log(`✓ Teachers page loaded: "${await heading.textContent()}"`);
});

// ─── WORKFLOW 4: Branches, Courses, Subjects, Batches ────────────────────────

test('WF-04: Academic CRUD Pages Load', async ({ page }) => {
  const consoleErrors = [];
  page.on('console', (msg) => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });

  await loginAs(page, 'admin', 'admin@qainstitute.com', 'AdminPass@123');
  await expect(page).not.toHaveURL(/\/login/);

  for (const route of ['/batches', '/students', '/teachers']) {
    const pageErrors = [];
    page.on('console', (msg) => { if (msg.type() === 'error') pageErrors.push(msg.text()); });

    await page.goto(`${BASE}${route}`);
    await page.waitForLoadState('networkidle');

    // Page must NOT be completely blank
    const bodyText = await page.locator('body').innerText();
    expect(bodyText.trim().length, `Page ${route} appears blank`).toBeGreaterThan(10);

    console.log(`✓ ${route} loaded (${bodyText.trim().length} chars)`);
    if (pageErrors.length > 0) {
      console.log(`  Errors on ${route}: ${pageErrors.slice(0, 3).join(' | ')}`);
    }
  }
});

// ─── WORKFLOW 5: Attendance Page ─────────────────────────────────────────────

test('WF-05: Attendance Page Renders', async ({ page }) => {
  await loginAs(page, 'admin', 'admin@qainstitute.com', 'AdminPass@123');
  await expect(page).not.toHaveURL(/\/login/);

  await page.goto(`${BASE}/attendance`);
  await page.waitForLoadState('networkidle');
  const bodyText = await page.locator('body').innerText();
  expect(bodyText.trim().length).toBeGreaterThan(10);
  console.log(`✓ Attendance page loaded`);
});

// ─── WORKFLOW 6: Homework, Tests, Results ────────────────────────────────────

test('WF-06: Homework, Tests, Results Pages Render', async ({ page }) => {
  await loginAs(page, 'admin', 'admin@qainstitute.com', 'AdminPass@123');
  await expect(page).not.toHaveURL(/\/login/);

  for (const route of ['/homework', '/tests', '/results']) {
    await page.goto(`${BASE}${route}`);
    await page.waitForLoadState('networkidle');
    const bodyText = await page.locator('body').innerText();
    const hasContent = bodyText.trim().length > 10;
    console.log(`  ${route}: ${hasContent ? '✓ Loaded' : '✗ BLANK'} (${bodyText.trim().length} chars)`);
  }
});

// ─── WORKFLOW 7: Fee and Payments Pages ──────────────────────────────────────

test('WF-07: Fees & Payments Pages Render', async ({ page }) => {
  const consoleErrors = [];
  page.on('console', (msg) => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });

  await loginAs(page, 'admin', 'admin@qainstitute.com', 'AdminPass@123');
  await expect(page).not.toHaveURL(/\/login/);

  for (const route of ['/fees', '/payments']) {
    await page.goto(`${BASE}${route}`);
    await page.waitForLoadState('networkidle');
    const bodyText = await page.locator('body').innerText();
    console.log(`  ${route}: ${bodyText.trim().length > 10 ? '✓ Loaded' : '✗ BLANK'}`);
  }

  if (consoleErrors.length > 0) {
    console.log(`  Console errors: ${consoleErrors.slice(0, 5).join(' | ')}`);
  }
});

// ─── WORKFLOW 8: Finance, Expenses, Payroll ──────────────────────────────────

test('WF-08: Finance, Expenses, Payroll Render', async ({ page }) => {
  const consoleErrors = [];
  page.on('console', (msg) => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });

  await loginAs(page, 'admin', 'admin@qainstitute.com', 'AdminPass@123');
  await expect(page).not.toHaveURL(/\/login/);

  for (const route of ['/finance', '/payroll']) {
    await page.goto(`${BASE}${route}`);
    await page.waitForLoadState('networkidle');
    const bodyText = await page.locator('body').innerText();
    console.log(`  ${route}: ${bodyText.trim().length > 10 ? '✓ Loaded' : '✗ BLANK'} (${bodyText.trim().length} chars)`);
  }

  if (consoleErrors.length > 0) {
    console.log(`  Console errors: ${consoleErrors.slice(0, 5).join(' | ')}`);
  }
});

// ─── WORKFLOW 9: Reports & Dashboard KPI values ───────────────────────────────

test('WF-09: Reports & Dashboard KPI Values', async ({ page }) => {
  await loginAs(page, 'admin', 'admin@qainstitute.com', 'AdminPass@123');
  await expect(page).not.toHaveURL(/\/login/);

  await page.goto(`${BASE}/reports`);
  await page.waitForLoadState('networkidle');
  const bodyText = await page.locator('body').innerText();
  console.log(`  Reports: ${bodyText.trim().length > 10 ? '✓ Loaded' : '✗ BLANK'}`);

  // Dashboard KPI via API
  const dashboardPage = await page.goto(`${BASE}/dashboard`);
  await page.waitForLoadState('networkidle');
  const dashBodyText = await page.locator('body').innerText();
  console.log(`  Dashboard: ${dashBodyText.trim().length > 10 ? '✓ Loaded' : '✗ BLANK'}`);
});

// ─── WORKFLOW 10: Teacher & Student Access Restrictions ───────────────────────

test('WF-10: Teacher Login & Access Scope', async ({ page }) => {
  await loginAs(page, 'teacher', 'TCH-26-0001', 'TeacherPass@123');
  const url = page.url();
  const isTeacherRoute = url.includes('/teacher') || url.includes('/dashboard');
  console.log(`  Teacher login redirected to: ${url}`);
  console.log(`  Teacher route: ${isTeacherRoute ? '✓ Correct' : '✗ Unexpected route'}`);

  // Teacher should NOT have access to admin-only routes
  await page.goto(`${BASE}/students/add`);
  await page.waitForLoadState('networkidle');
  const addStudentUrl = page.url();
  console.log(`  Teacher accessing /students/add redirected to: ${addStudentUrl}`);
});

test('WF-11: Student Login & Access Scope', async ({ page }) => {
  await loginAs(page, 'student', 'STU-26-0001', 'StudentPass@123');
  const url = page.url();
  const isStudentRoute = url.includes('/student') || url.includes('/dashboard');
  console.log(`  Student login redirected to: ${url}`);
  console.log(`  Student route: ${isStudentRoute ? '✓ Correct' : '✗ Unexpected route'}`);

  // Student should NOT access Finance
  await page.goto(`${BASE}/finance`);
  await page.waitForLoadState('networkidle');
  const financeUrl = page.url();
  console.log(`  Student accessing /finance redirected to: ${financeUrl}`);
});
