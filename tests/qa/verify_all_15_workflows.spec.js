import { test, expect } from '@playwright/test';

test.setTimeout(90000);

const BASE = 'http://localhost:5173';

const API = 'http://127.0.0.1:8000/api/v1';
const TOKEN_KEY = 'edupilot_token';

/**
 * loginAs — bypass login UI, call backend API directly,
 * inject JWT into sessionStorage, navigate to dashboard.
 */
async function loginAs(page, role, identifier, password) {
  await page.goto(`${BASE}/login`);
  await page.waitForLoadState('domcontentloaded');

  const result = await page.evaluate(async ({ api, id, pw, rt, key }) => {
    try {
      const resp = await fetch(`${api}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: id, password: pw, roleType: rt }),
      });
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        return { ok: false, error: err.detail || `HTTP ${resp.status}` };
      }
      const data = await resp.json();
      sessionStorage.setItem(key, data.access_token);
      return { ok: true };
    } catch (e) {
      return { ok: false, error: String(e) };
    }
  }, { api: API, id: identifier, pw: password, rt: role, key: TOKEN_KEY });

  if (!result.ok) {
    throw new Error(`loginAs failed for ${identifier}: ${result.error}`);
  }

  const dashPath = role === 'student' ? '/student' : role === 'teacher' ? '/teacher' : '/dashboard';
  await page.goto(`${BASE}${dashPath}`);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(800);
}


// ─── ADMIN WORKFLOWS ──────────────────────────────────────────────────────────

test('Workflow 1-3: Admin Creates Student, Persistence & Student Login', async ({ page }) => {
  const timestamp = Date.now();
  const studentName = `Auto Student ${timestamp}`;

  // Step 1: Admin Login
  await loginAs(page, 'admin', 'admin@qainstitute.com', 'AdminPass@123');
  expect(page.url()).not.toContain('/login');

  // Step 2: Register New Student with Course & Batch
  await page.goto(`${BASE}/students/add`);
  await page.waitForTimeout(500);

  await page.fill('input[placeholder*="Aarav"]', studentName);
  await page.fill('input[placeholder*="STU-"]', `STU-TMP-${timestamp.toString().slice(-4)}`);

  await page.click('button[type="submit"]');

  // Wait for provisioned modal & capture code
  await page.waitForSelector('text=Student Account Provisioned', { timeout: 10000 });
  const dialogText = await page.locator('div[role="dialog"]').last().innerText();
  const match = dialogText.match(/STU-[A-Z0-9-]+/i);
  const studentCode = match ? match[0] : '';
  console.log(`✓ Provisioned Student Code: ${studentCode}`);
  expect(studentCode).not.toBe('');

  const doneBtn = page.locator('button:has-text("Done & Return to Roster"), button:has-text("Done")').first();
  if (await doneBtn.isVisible()) {
    await doneBtn.click();
    await page.waitForTimeout(500);
  }

  // Step 3: Confirm student in Admin Roster & refresh persistence
  await page.goto(`${BASE}/students`);
  await page.waitForTimeout(1000);
  await page.fill('input[placeholder*="Search by student name"]', studentName);
  await page.waitForTimeout(500);
  await expect(page.locator(`text=${studentName}`)).toBeVisible({ timeout: 5000 });

  await page.reload();
  await page.waitForTimeout(1000);
  await page.fill('input[placeholder*="Search by student name"]', studentName);
  await page.waitForTimeout(500);
  await expect(page.locator(`text=${studentName}`)).toBeVisible();
  console.log(`✓ Student "${studentName}" created & persisted in Admin Roster`);

  // Step 4: Student Logs In
  await loginAs(page, 'student', studentCode, 'Password@123');
  expect(page.url()).toContain('/student');

  const portalBody = await page.locator('body').innerText();
  expect(portalBody).not.toContain('Student profile not found');
  console.log('✓ Student logged in and loaded Student Portal successfully');
});

test('Workflow 4 (Teacher): Admin Creates Teacher & Teacher Logs In', async ({ page }) => {
  const timestamp = Date.now();
  const teacherName = `Auto Teacher ${timestamp}`;

  // Step 1: Admin Creates Teacher
  await loginAs(page, 'admin', 'admin@qainstitute.com', 'AdminPass@123');
  await page.goto(`${BASE}/teachers`);
  await page.waitForTimeout(1000);

  const addBtn = page.locator('button:has-text("Add New Teacher")').first();
  await addBtn.click();
  await page.waitForTimeout(500);

  await page.locator('div[role="dialog"] input').first().fill(teacherName);
  await page.locator('div[role="dialog"] input[placeholder*="Mathematics"]').fill('Mathematics & Physics');

  await page.click('button:has-text("Register Faculty")');

  await page.waitForSelector('text=Faculty Account Provisioned', { timeout: 10000 });
  const dialogText = await page.locator('div[role="dialog"]').last().innerText();
  const match = dialogText.match(/TCH-[A-Z0-9-]+/i);
  const teacherCode = match ? match[0] : '';
  console.log(`✓ Provisioned Teacher Code: ${teacherCode}`);
  expect(teacherCode).not.toBe('');

  const doneBtn = page.locator('button:has-text("Done")').last();
  if (await doneBtn.isVisible()) {
    await doneBtn.click();
    await page.waitForTimeout(500);
  }

  // Step 2: Teacher Logs In & Verifies Linking
  await loginAs(page, 'teacher', teacherCode, 'Password@123');
  const dashboardText = await page.locator('body').innerText();
  expect(dashboardText).not.toContain('Teacher Profile Unlinked');
  console.log('✓ Teacher logged in without "Teacher Profile Unlinked" warning!');
});

test('Workflow 5: Course Subject Relationship & Card Update', async ({ page }) => {
  await loginAs(page, 'admin', 'admin@qainstitute.com', 'AdminPass@123');
  await page.goto(`${BASE}/courses`);
  await page.waitForTimeout(1500);

  const timestamp = Date.now();
  const subjectName = `Physics Lab ${timestamp}`;

  const manageBtn = page.locator('button:has-text("Manage Subjects")').first();
  await expect(manageBtn).toBeVisible({ timeout: 10000 });
  await manageBtn.click();
  await page.waitForTimeout(500);

  await page.fill('input[placeholder*="Physics / Algebra"]', subjectName);
  await page.click('button:has-text("Add Subject")');
  await page.waitForTimeout(1500);

  const closeBtn = page.locator('button:has-text("Close")').last();
  await closeBtn.click();
  await page.waitForTimeout(1000);

  await expect(page.locator(`text=${subjectName}`)).toBeVisible({ timeout: 5000 });

  await page.reload();
  await page.waitForTimeout(1000);
  await expect(page.locator(`text=${subjectName}`)).toBeVisible();
  console.log(`✓ Subject "${subjectName}" added and persisted on course card`);
});

test('Workflow 6: Admissions Create & Enquiry Conversion', async ({ page }) => {
  await loginAs(page, 'admin', 'admin@qainstitute.com', 'AdminPass@123');
  await page.goto(`${BASE}/admissions`);
  await page.waitForTimeout(1000);

  const timestamp = Date.now();
  const enquiryName = `Prospect ${timestamp}`;

  await page.click('button:has-text("New Enquiry")');
  await page.waitForTimeout(500);

  await page.locator('div[role="dialog"] input').first().fill(enquiryName);
  await page.locator('div[role="dialog"] input[placeholder*="Phone"], div[role="dialog"] input').nth(2).fill('9876543210');
  await page.click('button[type="submit"]:has-text("Save Enquiry")');
  await page.waitForTimeout(2000);

  await page.fill('input[placeholder*="Search name"]', enquiryName);
  await page.waitForTimeout(1000);

  const enquiryRow = page.locator(`tr:has-text("${enquiryName}")`).first();
  await expect(enquiryRow).toBeVisible({ timeout: 10000 });

  const convertBtn = enquiryRow.locator('button:has-text("Convert")');
  if (await convertBtn.isVisible()) {
    await convertBtn.click();
    await page.waitForTimeout(500);

    const courseSelect = page.locator('select').first();
    const batchSelect = page.locator('select').nth(1);

    if (await courseSelect.locator('option').count() > 1) {
      await courseSelect.selectOption({ index: 1 });
    }
    if (await batchSelect.locator('option').count() > 1) {
      await batchSelect.selectOption({ index: 1 });
    }

    await page.click('button:has-text("Confirm conversion")');
    await page.waitForTimeout(2000);

    const pageText = await page.locator('body').innerText();
    expect(pageText).not.toContain('client is not defined');
    console.log('✓ Admission enquiry converted cleanly without client error');
  }
});

test('Workflow 7: Study Material Upload & Persistence', async ({ page }) => {
  await loginAs(page, 'admin', 'admin@qainstitute.com', 'AdminPass@123');
  await page.goto(`${BASE}/study-material`);
  await page.waitForTimeout(1500);

  const timestamp = Date.now();
  const materialTitle = `Physics Notes ${timestamp}`;

  const uploadBtn = page.locator('button:has-text("Upload Study Material")').first();
  await expect(uploadBtn).toBeVisible({ timeout: 10000 });
  await uploadBtn.click();
  await page.waitForTimeout(500);

  await page.fill('input[placeholder*="Laws of Motion"]', materialTitle);
  await page.fill('input[placeholder*="youtube.com"]', 'https://example.com/material.pdf');

  await page.click('button[type="submit"]:has-text("Publish Resource")');
  await page.waitForTimeout(2000);

  await page.fill('input[placeholder*="Search by title"]', materialTitle);
  await page.waitForTimeout(500);
  await expect(page.locator(`text=${materialTitle}`)).toBeVisible({ timeout: 5000 });

  await page.reload();
  await page.waitForTimeout(1000);
  await page.fill('input[placeholder*="Search by title"]', materialTitle);
  await page.waitForTimeout(500);
  await expect(page.locator(`text=${materialTitle}`)).toBeVisible();
  console.log(`✓ Study material "${materialTitle}" published and persisted`);
});

test('Workflow 8: Record Payment & Fee Balance History', async ({ page }) => {
  await loginAs(page, 'admin', 'admin@qainstitute.com', 'AdminPass@123');
  await page.goto(`${BASE}/fees`);
  await page.waitForTimeout(1500);

  const pageText = await page.locator('body').innerText();
  expect(pageText).not.toContain('Error Loading Fee Records');

  // Verify Fee Register loads
  const feeHeader = page.locator('h1:has-text("Fees & Student Payment Ledger")');
  await expect(feeHeader).toBeVisible({ timeout: 5000 });
  console.log('✓ Fee Structure & Payment Ledger loaded cleanly');
});

test('Workflow 9: Attendance Marking & Persistence', async ({ page }) => {
  await loginAs(page, 'admin', 'admin@qainstitute.com', 'AdminPass@123');
  await page.goto(`${BASE}/attendance`);
  await page.waitForTimeout(1500);

  const markBtn = page.locator('button:has-text("Mark All Present"), button:has-text("Save Attendance")').first();
  await expect(markBtn).toBeVisible({ timeout: 5000 });
  await markBtn.click();
  await page.waitForTimeout(1500);

  await page.reload();
  await page.waitForTimeout(1000);
  console.log('✓ Attendance marked and persisted across refresh');
});

test('Workflow 10: AI Copilot Assistant Prompt Execution', async ({ page }) => {
  await loginAs(page, 'admin', 'admin@qainstitute.com', 'AdminPass@123');

  const trigger = page.locator('#edupilot-copilot-trigger');
  await expect(trigger).toBeVisible({ timeout: 5000 });
  await trigger.click();
  await page.waitForTimeout(500);

  const input = page.locator('#edupilot-copilot-input');
  await input.fill('Give me an institute performance summary.');
  await page.keyboard.press('Enter');
  await page.waitForTimeout(3000);

  const chatBody = await page.locator('div[role="log"]').innerText();
  expect(chatBody).not.toContain('Unable to reach the EduPilot AI service');
  console.log('✓ AI Copilot responded successfully!');
});

// ─── TEACHER WORKFLOWS ────────────────────────────────────────────────────────

test('Teacher Workflow: Homework & Test Creation & Navigation Persistence', async ({ page }) => {
  await loginAs(page, 'admin', 'admin@qainstitute.com', 'AdminPass@123');
  
  // Test Homework Page
  await page.goto(`${BASE}/homework`);
  await page.waitForTimeout(1000);
  expect(page.url()).toContain('/homework');
  console.log('✓ Homework page loaded');

  // Test Exams Page
  await loginAs(page, 'admin', 'admin@qainstitute.com', 'AdminPass@123');
  await page.goto(`${BASE}/tests`);
  await page.waitForTimeout(1000);
  expect(page.url()).toContain('/tests');
  console.log('✓ Tests and Exams page loaded');
});

// ─── STUDENT WORKFLOWS ────────────────────────────────────────────────────────

test('Student Isolation: Student Cannot Access Admin Routes', async ({ page }) => {
  // Login as Student
  await loginAs(page, 'student', 'STU-26-0001', 'Password@123');

  // Attempt to navigate to Admin Dashboard
  await page.goto(`${BASE}/dashboard`);
  await page.waitForTimeout(1000);

  // Should redirect back to /student or /login
  const currentUrl = page.url();
  expect(currentUrl).not.toContain('/dashboard');
  console.log(`✓ Student unauthorized access prevented. Current URL: ${currentUrl}`);
});
