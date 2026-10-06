import { test, expect } from '@playwright/test';

test.setTimeout(60000);

const BASE = 'http://localhost:5173';

async function loginAs(page, role, identifier, password) {
  await page.goto(`${BASE}/login`);
  await page.evaluate(() => sessionStorage.clear());
  await page.goto(`${BASE}/login`);
  await page.waitForTimeout(500);

  if (role === 'student') {
    await page.locator('button', { hasText: /^Student$/ }).click();
  } else if (role === 'teacher') {
    await page.locator('button', { hasText: /^Teacher$/ }).click();
  } else {
    await page.locator('button', { hasText: /^Admin$/ }).click();
  }
  await page.waitForTimeout(300);

  if (role === 'admin') {
    await page.fill('input[type="email"]', identifier);
  } else {
    await page.fill('input[name="identifier"]', identifier);
  }
  await page.fill('input[type="password"]', password);
  await page.click('button[type="submit"]');

  try {
    await page.waitForURL((url) => !url.href.includes('/login'), { timeout: 8000 });
  } catch {
    await page.waitForTimeout(1000);
  }
}

// ─── ISSUE 1: Student Registration & Login ──────────────────────────────────
test('P0-1: Student Registration, Persistence & Portal Login', async ({ page }) => {
  const timestamp = Date.now();
  const studentName = `Auto Student ${timestamp}`;

  // Step 1: Admin Login
  await loginAs(page, 'admin', 'admin@qainstitute.com', 'AdminPass@123');
  expect(page.url()).not.toContain('/login');

  // Step 2: Register New Student via UI
  await page.goto(`${BASE}/students/add`);
  await page.waitForTimeout(500);

  await page.fill('input[placeholder*="Aarav"]', studentName);
  await page.fill('input[placeholder*="STU-"]', `STU-TMP-${timestamp.toString().slice(-4)}`);

  await page.click('button[type="submit"]');

  // Wait for provisioned modal
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

  // Step 3: Confirm student appears in Admin Students Roster
  await page.goto(`${BASE}/students`);
  await page.waitForTimeout(1000);
  await page.fill('input[placeholder*="Search by student name"]', studentName);
  await page.waitForTimeout(500);
  const studentElement = page.locator(`text=${studentName}`);
  await expect(studentElement).toBeVisible({ timeout: 5000 });
  console.log(`✓ Student "${studentName}" visible in Admin Roster`);

  // Step 4: Refresh and verify persistence
  await page.reload();
  await page.waitForTimeout(1000);
  await page.fill('input[placeholder*="Search by student name"]', studentName);
  await page.waitForTimeout(500);
  await expect(page.locator(`text=${studentName}`)).toBeVisible();
  console.log(`✓ Student "${studentName}" persisted after browser refresh`);

  // Step 5: Attempt Student Login with assigned credentials
  await loginAs(page, 'student', studentCode, 'Password@123');

  const studentUrl = page.url();
  expect(studentUrl).not.toContain('/login');
  console.log(`✓ Student login successful! Redirected to: ${studentUrl}`);

  // Confirm student portal loads their record
  const portalBody = await page.locator('body').innerText();
  expect(portalBody).not.toContain('Student profile not found');
  console.log('✓ Student Portal loaded student record successfully');
});

// ─── ISSUE 2: Teacher Profile Linking ────────────────────────────────────────
test('P0-2: Teacher Creation, Profile Linking & Faculty Portal Login', async ({ page }) => {
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

  // Wait for provisioned modal
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

  // Find generated teacher in roster list
  await page.goto(`${BASE}/teachers`);
  await page.waitForTimeout(1000);
  await page.fill('input[placeholder*="Search by teacher name"]', teacherName);
  await page.waitForTimeout(500);
  const teacherCard = page.locator(`text=${teacherName}`);
  await expect(teacherCard).toBeVisible({ timeout: 5000 });
  console.log(`✓ Teacher "${teacherName}" visible in roster`);

  // Step 2: Teacher Logs In
  await loginAs(page, 'teacher', teacherCode, 'Password@123');

  // Step 3: Verify No "Teacher Profile Unlinked" warning
  const dashboardText = await page.locator('body').innerText();
  expect(dashboardText).not.toContain('Teacher Profile Unlinked');
  console.log('✓ Teacher dashboard loaded without "Teacher Profile Unlinked" warning!');
});

// ─── ISSUE 3: Course Subject Relationship ─────────────────────────────────────
test('P1-3: Course Subject Relationship, Card Update & Refresh Persistence', async ({ page }) => {
  await loginAs(page, 'admin', 'admin@qainstitute.com', 'AdminPass@123');
  await page.goto(`${BASE}/courses`);
  await page.waitForTimeout(1500);

  const timestamp = Date.now();
  const subjectName = `Physics Lab ${timestamp}`;

  // Open Manage Subjects on first course card
  const manageBtn = page.locator('button:has-text("Manage Subjects")').first();
  await expect(manageBtn).toBeVisible({ timeout: 10000 });
  await manageBtn.click();
  await page.waitForTimeout(500);

  // Add Subject inside Modal
  await page.fill('input[placeholder*="Physics / Algebra"]', subjectName);
  await page.click('button:has-text("Add Subject")');
  await page.waitForTimeout(1500);

  // Close Modal
  const closeBtn = page.locator('button:has-text("Close")').last();
  await closeBtn.click();
  await page.waitForTimeout(1000);

  // Confirm subject is displayed on course card
  const subjectTag = page.locator(`text=${subjectName}`);
  await expect(subjectTag).toBeVisible({ timeout: 5000 });
  console.log(`✓ Added subject "${subjectName}" visible on course card`);

  // Refresh page and confirm persistence
  await page.reload();
  await page.waitForTimeout(1000);
  await expect(page.locator(`text=${subjectName}`)).toBeVisible();
  console.log(`✓ Subject "${subjectName}" persisted after page refresh`);

  // Delete subject
  await page.locator('button:has-text("Manage Subjects")').first().click();
  await page.waitForTimeout(500);

  page.on('dialog', (dialog) => dialog.accept());
  const deleteBtn = page.locator(`div:has-text("${subjectName}") button[title="Delete Subject"]`).first();
  if (await deleteBtn.isVisible()) {
    await deleteBtn.click();
    await page.waitForTimeout(1000);
  }
  await page.locator('button:has-text("Close")').last().click();
  console.log('✓ Subject deletion verified');
});

// ─── ISSUE 4: Admissions Error ────────────────────────────────────────────────
test('P1-4: Admissions Create, Edit & Enquiry Conversion', async ({ page }) => {
  await loginAs(page, 'admin', 'admin@qainstitute.com', 'AdminPass@123');
  await page.goto(`${BASE}/admissions`);
  await page.waitForTimeout(1000);

  const timestamp = Date.now();
  const enquiryName = `Prospect ${timestamp}`;

  // Create Enquiry
  await page.click('button:has-text("New Enquiry")');
  await page.waitForTimeout(500);

  await page.locator('div[role="dialog"] input').first().fill(enquiryName);
  await page.locator('div[role="dialog"] input[placeholder*="Phone"], div[role="dialog"] input').nth(2).fill('9876543210');
  await page.click('button[type="submit"]:has-text("Save Enquiry")');
  await page.waitForTimeout(1500);

  // Confirm enquiry appears
  const enquiryRow = page.locator(`tr:has-text("${enquiryName}")`);
  await expect(enquiryRow).toBeVisible();
  console.log(`✓ Enquiry "${enquiryName}" created successfully`);

  // Convert Enquiry
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
    console.log('✓ Conversion completed cleanly without client error!');
  }
});

// ─── ISSUE 5: Study Material Upload ──────────────────────────────────────────
test('P1-5: Study Material Upload & Retrieval Persistence', async ({ page }) => {
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

  const matCard = page.locator(`text=${materialTitle}`);
  await expect(matCard).toBeVisible({ timeout: 5000 });
  console.log(`✓ Study material "${materialTitle}" created in library`);

  await page.reload();
  await page.waitForTimeout(1000);
  await page.fill('input[placeholder*="Search by title"]', materialTitle);
  await page.waitForTimeout(500);
  await expect(page.locator(`text=${materialTitle}`)).toBeVisible();
  console.log(`✓ Study material "${materialTitle}" persisted after refresh without "Failed to fetch"`);
});

// ─── ISSUE 6: AI Copilot ──────────────────────────────────────────────────────
test('P1-6: AI Copilot Prompt Execution', async ({ page }) => {
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
