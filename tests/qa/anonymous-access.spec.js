import { expect, test } from '../fixtures/rolePages.js';

const protectedRoutes = [
  '/dashboard', '/teacher', '/teacher/batches', '/student', '/students', '/finance', '/profile',
];

for (const route of protectedRoutes) {
  test(`anonymous user is redirected from ${route}`, async ({ anonymousPage: page }) => {
    await page.goto(route);
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByRole('heading', { name: 'EduPilot Portal' })).toBeVisible();
  });
}

test('register route redirects to login', async ({ anonymousPage: page }) => {
  await page.goto('/register');
  await expect(page).toHaveURL(/\/login$/);
});

test('landing route does not expose protected dashboard content', async ({ anonymousPage: page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /Next-Generation Coaching/ })).toBeVisible();
  await expect(page.getByText('Command center')).toHaveCount(0);
});

test('public enquiry requires name and phone without sending a request', async ({ anonymousPage: page }) => {
  let writeRequestSeen = false;
  page.on('request', (request) => {
    if (/\/rpc\/submit_public_enquiry|\/rest\/v1\/enquiries/.test(request.url())) writeRequestSeen = true;
  });

  await page.goto('/');
  const name = page.locator('input[placeholder="Enter full name"]');
  const phone = page.locator('input[placeholder="Enter 10-digit mobile number"]');
  await page.getByRole('button', { name: 'Submit Inquiry' }).click();

  expect(await name.evaluate((element) => element.validity.valueMissing)).toBe(true);
  expect(await phone.evaluate((element) => element.validity.valueMissing)).toBe(true);
  expect(writeRequestSeen).toBe(false);
});