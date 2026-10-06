import { test, expect } from '@playwright/test';

// Real UI registration: validation -> QA registration -> redirect -> admin login.
// No JWT injection, no mocks.
const stamp = Date.now().toString(36);
const qaEmail = `qa.ui.${stamp}@test.local`;
const qaPass = 'QaUiTest123!';

test('register-as-admin full UI flow', async ({ page }) => {
  await page.goto('/register-admin');
  // Invalid: submit empty, stays on page
  await page.locator('button[type="submit"]').click();
  await expect(page).toHaveURL(/register-admin/);

  // Fill valid QA data
  await page.getByPlaceholder('e.g. Sunrise Coaching Classes').fill(`QA UI Institute ${stamp}`);
  await page.getByPlaceholder('institute@example.com').fill(qaEmail);
  await page.getByPlaceholder('e.g. 98765 43210').fill('+911234567890');
  await page.getByPlaceholder('Street, area, city, state').fill('123 QA Street, Test City');
  await page.getByPlaceholder('e.g. Rahul Sharma').fill('QA UI Admin');
  await page.getByPlaceholder('admin@institute.com').fill(qaEmail);
  await page.getByPlaceholder('••••••••').first().fill(qaPass);
  await page.getByPlaceholder('••••••••').nth(1).fill(qaPass);
  await page.locator('button[type="submit"]').click();

  // Success banner then redirect to admin login
  await expect(page.getByText('Registration successful')).toBeVisible({ timeout: 15000 });
  await expect(page).toHaveURL(/\/login\?registered=1/, { timeout: 15000 });

  // Admin tab must be default after registration redirect
  await expect(page.locator('button[type="submit"]')).toContainText('Sign in as Admin');

  // Login as the newly registered admin via UI
  await page.locator('input[type="email"]').fill(qaEmail);
  await page.locator('input[type="password"]').fill(qaPass);
  await page.locator('button[type="submit"]').click();
  await expect(page).toHaveURL(/dashboard/, { timeout: 15000 });
});

test('duplicate registration shows useful error', async ({ page }) => {
  await page.goto('/register-admin');
  await page.getByPlaceholder('e.g. Sunrise Coaching Classes').fill('QA Dup Institute');
  await page.getByPlaceholder('institute@example.com').fill(qaEmail);
  await page.getByPlaceholder('e.g. 98765 43210').fill('+911234567890');
  await page.getByPlaceholder('Street, area, city, state').fill('123 QA Street, Test City');
  await page.getByPlaceholder('e.g. Rahul Sharma').fill('QA Dup Admin');
  await page.getByPlaceholder('admin@institute.com').fill(qaEmail);
  await page.getByPlaceholder('••••••••').first().fill(qaPass);
  await page.getByPlaceholder('••••••••').nth(1).fill(qaPass);
  await page.locator('button[type="submit"]').click();
  await expect(page.getByRole('alert')).toContainText(/already exists/i, { timeout: 15000 });
  await expect(page).toHaveURL(/register-admin/);
});
