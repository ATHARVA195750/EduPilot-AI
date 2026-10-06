/**
 * P2 — STUDY MATERIAL Draft/Published workflow (real Chromium).
 *
 * P2a: Admin creates a Draft + a Published material (batch 10A), verifies the
 *      badges survive a full reload (backend persistence, no faked state),
 *      proves is_published via the API, toggles Draft<->Published, and checks
 *      the toggle persists.
 * P2b: Student sees ONLY published materials (draft invisible), scoped to
 *      institute + allowed batch/institute-wide.
 * P2c: Delete persistence (the DELETE path used to be a frontend stub) +
 *      cleanup of P2 fixtures.
 *
 * Run: npx playwright test --config playwright.e2e.config.js stabilization_p2.spec.js
 */
import { test, expect } from '@playwright/test';

const ADMIN = { mode: 'Admin', id: 'admin@qainstitute.com', pw: 'AdminPass@123' };
const STUDENT = { mode: 'Student', id: 'STU-26-0001', pw: 'StudentPass@123' };
const BATCH_ID = '762a439e-e72f-4e38-bbe0-dda8e8de0b56'; // Batch 10A Morning (student's batch)
const DRAFT_TITLE = 'P2 QA Draft Do Not Publish';
const PUBLISHED_TITLE = 'P2 QA Published For Batch 10A';

async function login(page, acct) {
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

function cardFor(page, title) {
  return page
    .locator('h3', { hasText: title })
    .locator('xpath=ancestor::div[contains(@class,"hover:shadow-lg")][1]');
}

async function apiMaterials(page) {
  const token = await page.evaluate(() => sessionStorage.getItem('edupilot_token'));
  const res = await page.request.get('http://127.0.0.1:8000/api/v1/academics/study-materials', {
    headers: { Authorization: `Bearer ${token}` },
  });
  expect(res.ok()).toBeTruthy();
  return res.json();
}

async function createMaterial(page, title, { publish }) {
  await page.getByRole('button', { name: /Upload Study Material/ }).click();
  const dialog = page.getByRole('dialog', { name: 'Upload Study Material' });
  await expect(dialog).toBeVisible();
  await dialog.getByLabel('Material Title').fill(title);
  await dialog.locator('select').first().selectOption(BATCH_ID); // Target Batch
  if (publish) {
    await expect(dialog.locator('#is_published')).toBeChecked();
  } else {
    await dialog.locator('#is_published').uncheck();
  }
  await dialog.getByRole('button', { name: 'Publish Resource', exact: true }).click();
  await expect(dialog).toBeHidden({ timeout: 15000 });
}

test('P2a admin draft/published workflow persists in the browser', async ({ page }) => {
  test.setTimeout(120000);

  await login(page, ADMIN);
  await page.goto('/study-material');
  await expect(page.getByRole('heading', { name: 'Digital Study Material Library' }))
    .toBeVisible({ timeout: 15000 });
  // Existing repository rendered
  await expect(page.locator('h3', { hasText: 'Physics Notes' }).first()).toBeVisible();

  // Create a DRAFT (batch 10A, publish checkbox off)
  await createMaterial(page, DRAFT_TITLE, { publish: false });
  await expect(cardFor(page, DRAFT_TITLE).first()).toContainText('Draft', { timeout: 15000 });

  // Create a PUBLISHED material (batch 10A, checkbox stays on)
  await createMaterial(page, PUBLISHED_TITLE, { publish: true });
  await expect(cardFor(page, PUBLISHED_TITLE).first()).toContainText('Published', { timeout: 15000 });

  // Full reload — statuses must come BACK from the backend (no frontend faking)
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Digital Study Material Library' }))
    .toBeVisible({ timeout: 15000 });
  await expect(cardFor(page, DRAFT_TITLE).first()).toContainText('Draft', { timeout: 15000 });
  await expect(cardFor(page, PUBLISHED_TITLE).first()).toContainText('Published', { timeout: 15000 });

  // API persistence proof (is_published round-trip in PostgreSQL)
  let rows = await apiMaterials(page);
  let draftRow = rows.filter((r) => r.title === DRAFT_TITLE).pop();
  let pubRow = rows.filter((r) => r.title === PUBLISHED_TITLE).pop();
  expect(draftRow, 'draft material missing from API').toBeTruthy();
  expect(pubRow, 'published material missing from API').toBeTruthy();
  expect(draftRow.is_published).toBe(false);
  expect(pubRow.is_published).toBe(true);

  // Toggle Draft -> Published (real PUT)
  await cardFor(page, DRAFT_TITLE).first()
    .getByRole('button', { name: /^(Published|Draft)$/ }).click();
  await expect(cardFor(page, DRAFT_TITLE).first())
    .toContainText('Published', { timeout: 15000 });
  rows = await apiMaterials(page);
  draftRow = rows.filter((r) => r.title === DRAFT_TITLE).pop();
  expect(draftRow.is_published).toBe(true);

  // Toggle back -> Draft (student visibility fixture for P2b)
  await cardFor(page, DRAFT_TITLE).first()
    .getByRole('button', { name: /^(Published|Draft)$/ }).click();
  await expect(cardFor(page, DRAFT_TITLE).first())
    .toContainText('Draft', { timeout: 15000 });
  rows = await apiMaterials(page);
  draftRow = rows.filter((r) => r.title === DRAFT_TITLE).pop();
  expect(draftRow.is_published).toBe(false);


  console.log('P2a OK — draft/published created, survived reload, toggles persisted via API');
});

test('P2b student sees only published materials', async ({ page }) => {
  test.setTimeout(90000);

  await login(page, STUDENT);
  await page.goto('/study-material');
  await expect(page.getByRole('heading', { name: 'Study Material', exact: true }))
    .toBeVisible({ timeout: 15000 });

  // The Draft material must be INVISIBLE to the student
  await expect(page.locator('body')).not.toContainText(DRAFT_TITLE, { timeout: 15000 });
  // The Published material for their batch must be visible
  await expect(page.locator('body')).toContainText(PUBLISHED_TITLE, { timeout: 15000 });
  // Pre-existing published institute materials (batch-wide) visible too
  await expect(page.locator('body')).toContainText('Physics Notes');
  await expect(page.locator('body')).not.toContainText('Failed to fetch');

  console.log('P2b OK — student sees published only; draft hidden');
});

test('P2c delete persists and P2 fixtures are cleaned up', async ({ page }) => {
  test.setTimeout(120000);

  await login(page, ADMIN);
  await page.goto('/study-material');
  await expect(page.getByRole('heading', { name: 'Digital Study Material Library' }))
    .toBeVisible({ timeout: 15000 });

  for (const title of [DRAFT_TITLE, PUBLISHED_TITLE]) {
    // Delete every fixture card with this title (handles interrupted re-runs)
    for (let i = 0; i < 20; i += 1) {
      const count = await page.locator('h3', { hasText: title }).count();
      if (count === 0) break;
      await cardFor(page, title).first().getByRole('button', { name: 'Delete' }).click();
      const confirm = page.getByRole('dialog', { name: 'Confirm Deletion' });
      await expect(confirm).toBeVisible();
      await confirm.getByRole('button', { name: 'Delete Material' }).click();
      await expect(confirm).toBeHidden({ timeout: 15000 });
      await expect(page.locator('h3', { hasText: title }).first())
        .toBeHidden({ timeout: 15000 });
    }
    await expect(page.locator('h3', { hasText: title })).toHaveCount(0);
  }

  // API proof: fixtures are truly gone (DELETE was a frontend stub before)
  const rows = await apiMaterials(page);
  expect(rows.filter((r) => r.title === DRAFT_TITLE)).toHaveLength(0);
  expect(rows.filter((r) => r.title === PUBLISHED_TITLE)).toHaveLength(0);

  console.log('P2c OK — DELETE persisted server-side; fixtures cleaned');
});
