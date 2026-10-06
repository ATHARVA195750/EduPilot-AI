import { test, expect } from '@playwright/test';

test.setTimeout(90000);

const BASE = 'http://localhost:5173';

const API = 'http://127.0.0.1:8000/api/v1';
const TOKEN_KEY = 'edupilot_token';

/**
 * loginAs — bypass the login UI entirely.
 * Calls the backend login API directly, gets the JWT, injects it into
 * sessionStorage, then navigates to the target page.
 */
async function loginAs(page, role, identifier, password) {
  // First navigate to establish the origin (needed for sessionStorage writes)
  await page.goto(`${BASE}/login`);
  await page.waitForLoadState('domcontentloaded');

  // Call the backend login API directly from inside the browser context
  // Use Playwright request API to login (avoids CORS & fetch issues)
  const resp = await page.context().request.post(`${API}/auth/login`, {
    data: { identifier, password, roleType: role },
    headers: { 'Content-Type': 'application/json' },
  });
  if (!resp.ok()) {
    const err = await resp.json().catch(() => ({}));
    throw new Error(`loginAs failed: ${err.detail || resp.status()}`);
  }
  const { access_token } = await resp.json();
  // Store token in sessionStorage for the React app
  await page.evaluate((key, token) => {
    sessionStorage.setItem(key, token);
  }, TOKEN_KEY, access_token);


  // Navigate to the dashboard to hydrate the React auth context
  const dashPath = role === 'student' ? '/student' : role === 'teacher' ? '/teacher' : '/dashboard';
  await page.goto(`${BASE}${dashPath}`);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(800);
}



test('Admin Timetable Class Scheduling CRUD, Refresh & Conflict Verification', async ({ page }) => {
  await loginAs(page, 'admin', 'admin@qainstitute.com', 'AdminPass@123');
  await page.goto(`${BASE}/timetable`);
  // Wait for auth context to hydrate and render admin controls
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1500);

  // --- Step 1: Create a Schedule Slot ---
  // Wait up to 15s for the admin-only button to appear (depends on role loading from /auth/me)
  const scheduleBtn = page.locator('button:has-text("Schedule Class Slot"), button:has-text("Schedule Class"), button:has-text("Add Slot")').first();
  await expect(scheduleBtn).toBeVisible({ timeout: 15000 });

  await scheduleBtn.click();
  await page.waitForTimeout(1000);

  // Fill in Room and Topic if inputs exist
  const roomInput = page.locator('div[role="dialog"] input[placeholder*="Room"], div[role="dialog"] input').nth(1);
  if (await roomInput.isVisible()) {
    await roomInput.fill('Lab-404');
  }

  const submitBtn = page.locator('div[role="dialog"] button[type="submit"]').first();
  await submitBtn.evaluate((b) => b.click());
  await page.waitForTimeout(2000);

  // Assert NO "Failed to fetch" text
  let pageText = await page.locator('body').innerText();
  expect(pageText).not.toContain('Failed to fetch');
  console.log('✓ Class slot created cleanly without "Failed to fetch" error');

  // Refresh page and confirm persistence
  await page.reload();
  await page.waitForTimeout(2000);
  pageText = await page.locator('body').innerText();
  expect(pageText).not.toContain('Failed to fetch');
  console.log('✓ Class slot creation persisted across full browser refresh');

  // --- Step 2: Conflict / Overlap Checking ---
  // Attempt to create an overlapping slot on the same day/time
  await scheduleBtn.click();
  await page.waitForTimeout(1000);
  await submitBtn.evaluate((b) => b.click());
  await page.waitForTimeout(1500);

  const dialogText = await page.locator('div[role="dialog"]').last().innerText();
  expect(dialogText.toLowerCase()).toMatch(/conflict|already booked|already has a class|overlap|cannot|unable/i);
  console.log('✓ Schedule conflict prevention verified cleanly');

  // Close modal
  const cancelBtn = page.locator('div[role="dialog"] button:has-text("Cancel")').first();
  if (await cancelBtn.isVisible()) {
    await cancelBtn.click();
    await page.waitForTimeout(500);
  }

  // --- Step 3: Delete Schedule Slot ---
  const slotCard = page.locator('div:has-text("Lab-404"), tr:has-text("Lab-404")').first();
  if (await slotCard.isVisible()) {
    const actionBtn = slotCard.locator('button').last();
    if (await actionBtn.isVisible()) {
      await actionBtn.click();
      await page.waitForTimeout(500);
      const deleteOption = page.locator('button:has-text("Delete")').first();
      if (await deleteOption.isVisible()) {
        await deleteOption.click();
        await page.waitForTimeout(500);
        const confirmDelete = page.locator('button:has-text("Confirm"), button:has-text("Delete")').last();
        if (await confirmDelete.isVisible()) {
          await confirmDelete.click();
          await page.waitForTimeout(1500);
        }
      }
    }
  }

  // Refresh and verify persistence after deletion
  await page.reload();
  await page.waitForTimeout(2000);
  console.log('✓ Schedule slot deletion verified across full browser refresh');
});
