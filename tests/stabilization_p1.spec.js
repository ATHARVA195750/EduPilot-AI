/**
 * P1 — PAYROLL browser workflow verification (real Chromium).
 *
 * Covers, entirely through the UI:
 *   1. Existing payroll record is displayed on /payroll
 *   2. Disbursement modal opens
 *   3. Duplicate period → server's exact duplicate error (never "[object Object]")
 *   4. Valid new period → success, modal closes, row appears
 *   5. Full refresh → data persists
 *
 * Run: npx playwright test --config playwright.e2e.config.js stabilization_p1.spec.js
 */
import { test, expect } from '@playwright/test';

const ADMIN = { mode: 'Admin', id: 'admin@qainstitute.com', pw: 'AdminPass@123' };
// Teacher owning the pre-existing payroll record (period 2026-10).
const EXISTING_TEACHER_ID = 'e12e4cb7-b800-4603-b7c3-deb946f3e66b';

async function login(page) {
  await page.goto('/login');
  await page.getByRole('button', { name: 'Admin', exact: true }).click();
  await page.fill('input[type="email"]', ADMIN.id);
  await page.fill('input[type="password"]', ADMIN.pw);
  await page.click('button[type="submit"]');
  await page.waitForURL((url) => !url.pathname.startsWith('/login'), { timeout: 20000 });
}

test('P1 payroll browser workflow', async ({ page }) => {
  test.setTimeout(120000);

  await login(page);
  await page.goto('/payroll');
  await expect(page.getByRole('heading', { name: 'Faculty & Staff Payroll' })).toBeVisible({ timeout: 15000 });

  const table = page.locator('table');
  // 1. Existing record displayed (base salary 60,000, status Paid)
  await expect(table).toContainText('₹60,000');
  await expect(table).toContainText('Paid');

  // 2. Disbursement modal
  await page.getByRole('button', { name: /Process Salary Payout/ }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText('Process Salary Disbursement');

  // 3. Duplicate: same teacher + default period (October 2026 = existing 2026-10)
  await dialog.locator('select').first().selectOption(EXISTING_TEACHER_ID);
  await dialog.getByLabel(/Base Salary/).fill('55000');
  await dialog.getByRole('button', { name: 'Disburse Payout' }).click();
  await expect(dialog).toContainText(
    'Payroll record already exists for this teacher and period',
    { timeout: 15000 },
  );
  await expect(dialog).not.toContainText('[object Object]');
  await expect(page.locator('body')).not.toContainText('[object Object]');

  // 4. Valid new period — try 2098 months until one is free (idempotent re-runs)
  const months = ['December', 'November', 'October', 'September', 'August', 'July',
    'June', 'May', 'April', 'March', 'February', 'January'];
  let createdMonth = null;
  for (const monthName of months) {
    await dialog.locator('select').nth(1).selectOption(monthName);
    await dialog.getByLabel(/Year/).fill('2098');
    await dialog.getByRole('button', { name: 'Disburse Payout' }).click();
    const closed = await dialog
      .waitFor({ state: 'hidden', timeout: 10000 })
      .then(() => true)
      .catch(() => false);
    if (closed) {
      createdMonth = monthName;
      break;
    }
    // Only acceptable error while probing = the duplicate guard (NOT [object Object])
    await expect(dialog).toContainText('already exists', { timeout: 10000 });
    await expect(dialog).not.toContainText('[object Object]');
  }
  expect(createdMonth, 'no creatable payroll period in 2098').not.toBeNull();

  // Success: modal closed, new row visible with its period.
  // Chain .filter({hasText}) so re-runs with leftover October 2098 rows do not
  // trigger strict-mode violations (October 2026 baseline also matches).
  const newRow = table.locator('tr').filter({ hasText: createdMonth }).filter({ hasText: '2098' });
  await expect(newRow.first()).toContainText('2098');
  await expect(newRow.first()).toContainText('Pending');

  // 5. Full refresh → data persists, period still rendered (from month_year)
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Faculty & Staff Payroll' })).toBeVisible({ timeout: 15000 });
  await expect(table).toContainText('₹60,000');
  await expect(
    table.locator('tr').filter({ hasText: createdMonth }).filter({ hasText: '2098' }).first(),
  ).toContainText('2098');
  await expect(page.locator('body')).not.toContainText('[object Object]');
  await expect(page.locator('body')).not.toContainText('Failed to fetch');

  console.log(`P1 OK — duplicate rejected with exact server error; created period ${createdMonth} 2098; persisted after refresh`);
});
