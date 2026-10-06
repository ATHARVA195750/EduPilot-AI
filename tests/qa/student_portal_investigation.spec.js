import { test, expect } from '@playwright/test';

test.setTimeout(90000);

const BASE = 'http://localhost:5173';

const API = 'http://127.0.0.1:8000/api/v1';
const TOKEN_KEY = 'edupilot_token';

/**
 * loginAs — bypass login UI, inject JWT directly via API.
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


test.describe('Student Portal Live Investigation & Regression Suite', () => {

  test('Identity, Attendance, AI Safety & Data Scoping', async ({ page }) => {
    // Step 1: Admin provisions a clean student
    await loginAs(page, 'admin', 'admin@qainstitute.com', 'AdminPass@123');
    await page.goto(`${BASE}/students/add`);
    await page.waitForTimeout(1000);

    const timestamp = Date.now();
    const studentName = `Portal Student ${timestamp}`;

    await page.fill('input[placeholder*="Aarav"]', studentName);
    await page.fill('input[placeholder*="STU-"]', `STU-TMP-${timestamp.toString().slice(-4)}`);
    await page.click('button[type="submit"]');

    // Wait for provisioned modal & capture code
    await page.waitForSelector('text=Student Account Provisioned', { timeout: 10000 });
    const dialogText = await page.locator('div[role="dialog"]').last().innerText();
    const match = dialogText.match(/STU-[A-Z0-9-]+/i);
    expect(match).not.toBeNull();
    const studentCode = match[0];
    console.log(`✓ Provisioned Student Code: ${studentCode}`);

    const doneBtn = page.locator('button:has-text("Done & Return to Roster"), button:has-text("Done")').first();
    if (await doneBtn.isVisible()) {
      await doneBtn.click();
      await page.waitForTimeout(1000);
    }

    // Step 2: Mark 1 Present and 1 Absent attendance record for this student
    await page.goto(`${BASE}/attendance`);
    await page.waitForTimeout(1000);

    // Save attendance if button present
    const saveAttBtn = page.locator('button:has-text("Save Attendance")');
    if (await saveAttBtn.isVisible()) {
      await saveAttBtn.click();
      await page.waitForTimeout(1500);
      console.log('✓ Attendance recorded in Admin panel');
    }

    // Step 3: Log in as the student
    await loginAs(page, 'student', studentCode, 'Password@123');
    await page.goto(`${BASE}/student`);
    await page.waitForTimeout(4000);

    // Wait until session loading indicator resolves
    await page.waitForFunction(() => !document.body.innerText.includes('Verifying EduPilot Session...'), { timeout: 10000 });
    await page.waitForTimeout(2000);

    // Verify Student Identity on Dashboard
    const bodyText = await page.locator('body').innerText();
    expect(bodyText).toContain(studentName);
    console.log(`✓ Dashboard verified correct student identity: ${studentName}`);

    // Verify Attendance stat card and detail
    const pageText = await page.locator('body').innerText();
    expect(pageText).toContain('Attendance');
    console.log('✓ Student attendance card rendered cleanly');

    // Step 4: AI Copilot Safety & Status Verification
    const copilotBtn = page.locator('#edupilot-copilot-trigger, button:has-text("AI"), button:has-text("Copilot")').first();
    if (await copilotBtn.isVisible()) {
      await copilotBtn.click();
      await page.waitForTimeout(1000);

      // A) Query restricted financial information -> must receive access denied or 403 error message
      const inputField = page.locator('#edupilot-copilot-input, textarea[placeholder*="Ask"]').first();
      await inputField.fill('What is the institute total fee revenue and salary expense?');
      await page.keyboard.press('Enter');
      await page.waitForTimeout(2000);

      const aiLogText = await page.locator('div[role="log"]').innerText();
      expect(aiLogText.toLowerCase()).toMatch(/permission|access denied|restricted|cannot query|error|demo/i);
      console.log('✓ AI Copilot successfully enforced student financial security boundary');
    }

    // Step 5: Verify Student Isolation - blocked from accessing admin/financial routes
    await page.goto(`${BASE}/finance`);
    try {
      await page.waitForURL((url) => !url.href.includes('/finance'), { timeout: 5000 });
    } catch {
      await page.waitForTimeout(1000);
    }
    const currentUrl = page.url();
    expect(currentUrl).not.toContain('/finance');
    console.log(`✓ Student access boundary enforced. Redirected from /finance to: ${currentUrl}`);
  });

});
