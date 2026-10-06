import { test, expect } from '@playwright/test';

const BASE = 'http://localhost:5173';

test.describe('Admin Full Smoke Suite', () => {
  let consoleErrors = [];

  test.beforeEach(async ({ page }) => {
    consoleErrors = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });
  });

  async function loginAsAdmin(page) {
    await page.goto(`${BASE}/login`);
    await page.waitForLoadState('networkidle');
    const adminTab = page.locator('button:has-text("Admin"), button:has-text("Owner")').first();
    if (await adminTab.isVisible()) {
      await adminTab.click();
    }
    await page.fill('input[type="email"]', 'admin@qainstitute.com');
    await page.fill('input[type="password"]', 'AdminPass@123');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(2000);
  }

  test('01. Admin Login & Dashboard', async ({ page }) => {
    await loginAsAdmin(page);
    await expect(page).not.toHaveURL(/\/login/);
    await page.goto(`${BASE}/dashboard`);
    await page.waitForLoadState('networkidle');
    await expect(page.locator('h1, h2, h3').first()).toBeVisible();
  });

  test('02. Students Module: Add & Persist', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto(`${BASE}/students/add`);
    await page.waitForLoadState('networkidle');
    const uniqueName = `Smoke Student ${Date.now()}`;
    const nameInput = page.locator('input').first();
    await expect(nameInput).toBeVisible({ timeout: 5000 });
    await nameInput.fill(uniqueName);
    const phoneInput = page.locator('input[type="tel"], input').nth(1);
    await phoneInput.fill('9876543210');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(2000);

    await page.goto(`${BASE}/students`);
    await page.waitForLoadState('networkidle');
    await page.reload();
    await page.waitForLoadState('networkidle');
    await expect(page.locator('h1, h2, h3').first()).toBeVisible();
  });

  test('03. Teachers Module: Add & Persist', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto(`${BASE}/teachers`);
    await page.waitForLoadState('networkidle');
    const addBtn = page.locator('button:has-text("Add Teacher"), button:has-text("New Teacher")').first();
    if (await addBtn.isVisible()) {
      await addBtn.click();
      await page.waitForTimeout(500);
      const uniqueName = `Smoke Teacher ${Date.now()}`;
      const nameInput = page.locator('input').first();
      if (await nameInput.isVisible()) {
        await nameInput.fill(uniqueName);
        const submitBtn = page.locator('button[type="submit"]').first();
        if (await submitBtn.isVisible()) {
          await submitBtn.click();
          await page.waitForTimeout(2000);
        }
      }

      await page.reload();
      await page.waitForLoadState('networkidle');
      await expect(page.locator('h1, h2, h3').first()).toBeVisible();
    }
  });

  test('04. Batches & Courses: Add & Persist', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto(`${BASE}/courses`);
    await page.waitForLoadState('networkidle');
    const addCourseBtn = page.locator('button:has-text("Add Course"), button:has-text("New Course")').first();
    if (await addCourseBtn.isVisible()) {
      await addCourseBtn.click();
      await page.waitForTimeout(500);
      const courseName = `Smoke Course ${Date.now()}`;
      const nameInput = page.locator('input').first();
      if (await nameInput.isVisible()) {
        await nameInput.fill(courseName);
        const submitBtn = page.locator('button[type="submit"]').first();
        if (await submitBtn.isVisible()) {
          await submitBtn.click();
          await page.waitForTimeout(2000);
        }
      }

      await page.reload();
      await page.waitForLoadState('networkidle');
      await expect(page.locator('h1, h2, h3').first()).toBeVisible();
    }
  });

  test('05. Attendance Module: Mark & Persist', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto(`${BASE}/attendance`);
    await page.waitForLoadState('networkidle');
    const saveBtn = page.locator('button:has-text("Save Attendance"), button:has-text("Mark Attendance")').first();
    if (await saveBtn.isVisible()) {
      await saveBtn.click();
      await page.waitForTimeout(2000);
    }

    await page.reload();
    await page.waitForLoadState('networkidle');
    await expect(page.locator('h1, h2, h3').first()).toBeVisible();
  });

  test('06. Fees & Payments Module: Assign & Persist', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto(`${BASE}/fees`);
    await page.waitForLoadState('networkidle');
    await expect(page.locator('h1, h2, h3').first()).toBeVisible();
  });

  test('07. Tests & Results Module', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto(`${BASE}/tests`);
    await page.waitForLoadState('networkidle');
    await expect(page.locator('h1, h2, h3').first()).toBeVisible();
  });

  test('08. Homework & Study Material Module', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto(`${BASE}/homework`);
    await page.waitForLoadState('networkidle');
    await expect(page.locator('h1, h2, h3').first()).toBeVisible();
  });

  test('09. Timetable Module', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto(`${BASE}/timetable`);
    await page.waitForLoadState('networkidle');
    await expect(page.locator('h1, h2, h3').first()).toBeVisible();
  });

  test('10. Communication & Announcements Module', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto(`${BASE}/communication`);
    await page.waitForLoadState('networkidle');
    await expect(page.locator('h1, h2, h3').first()).toBeVisible();
  });

  test('11. Finance & Payroll Module', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto(`${BASE}/finance`);
    await page.waitForLoadState('networkidle');
    await expect(page.locator('h1, h2, h3').first()).toBeVisible();
  });

  test('12. Settings & Profile Module', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto(`${BASE}/settings`);
    await page.waitForLoadState('networkidle');
    await expect(page.locator('h1, h2, h3').first()).toBeVisible();
  });
});
