import { test, expect } from '@playwright/test';

test.setTimeout(60000);

const BASE = 'http://localhost:5173';

test('Debug admin login step by step', async ({ page }) => {
  await page.goto(${BASE}/login);
  await page.waitForLoadState('networkidle');
  console.log('Step 1: On login page, URL:', page.url());
  
  const allButtons = await page.locator('button').all();
  console.log('Step 2: Number of buttons:', allButtons.length);
  for (let i = 0; i < allButtons.length; i++) {
    const text = await allButtons[i].innerText();
    const type = await allButtons[i].getAttribute('type');
    console.log(  Button[]: type="" text="");
  }
  
  const grid = page.locator('div.grid.grid-cols-3');
  const gridCount = await grid.count();
  console.log('Step 3: grid.grid-cols-3 count:', gridCount);
  
  if (gridCount > 0) {
    const gridButtons = page.locator('div.grid.grid-cols-3 button');
    const gridBtnCount = await gridButtons.count();
    console.log('Step 3a: buttons inside grid:', gridBtnCount);
    for (let i = 0; i < gridBtnCount; i++) {
      const text = await gridButtons.nth(i).innerText();
      console.log(  GridButton[]: "");
    }
    await gridButtons.nth(2).click();
    await page.waitForTimeout(800);
    console.log('Step 4: Clicked Admin tab (nth 2)');
    const emailInput = await page.locator('input[name="email"]').count();
    console.log('Step 4a: email input count:', emailInput);
  }
  
  await page.fill('input[name="email"]', 'admin@qainstitute.com');
  await page.fill('input[name="password"]', 'AdminPass@123');
  await page.locator('button[type="submit"]').click();
  
  try {
    await page.waitForURL((url) => !url.href.includes('/login'), { timeout: 15000 });
    console.log('Step 6: Navigated to:', page.url());
  } catch {
    console.log('Step 6 FAILED: Still on:', page.url());
    const bodyText = await page.locator('body').innerText();
    console.log('Body text sample:', bodyText.substring(0, 300));
  }
});
