import { expect, test as base } from '@playwright/test';
import { hasRoleCredentials } from '../utils/qaEnvironment.js';
import { cleanupQaFixtures, insertQaRow, selectQaRow, trackQaAuthUser } from '../utils/qaDatabase.js';

const roles = {
  owner: { tab: 'Admin', identifier: 'QA_OWNER_EMAIL', password: 'QA_OWNER_PASSWORD', input: 'Institute Admin Email', home: '/dashboard' },
  admin: { tab: 'Admin', identifier: 'QA_ADMIN_EMAIL', password: 'QA_ADMIN_PASSWORD', input: 'Institute Admin Email', home: '/dashboard' },
  teacher: { tab: 'Teacher', identifier: 'QA_TEACHER_ID', password: 'QA_TEACHER_PASSWORD', input: 'Teacher ID', home: '/teacher' },
  student: { tab: 'Student', identifier: 'QA_STUDENT_ID', password: 'QA_STUDENT_PASSWORD', input: 'Student ID', home: '/student' },
};

export async function loginAsRole(page, role) {
  const account = roles[role];
  if (!account) throw new Error(`Unsupported QA role: ${role}`);
  test.skip(!hasRoleCredentials(role), `Set the ${role} QA credentials in the local environment to enable this role test.`);

  await page.goto('/login');
  await page.getByRole('button', { name: account.tab, exact: true }).click();
  await page.getByLabel(account.input).fill(process.env[account.identifier]);
  await page.getByLabel('Password').fill(process.env[account.password]);
  await page.getByRole('button', { name: `Sign in as ${account.tab}` }).click();
  await expect(page).toHaveURL(new RegExp(`${account.home.replace('/', '\\/')}$`), { timeout: 30_000 });

  return account.home;
}

async function makeRoleFixture(page, use, role) {
  await loginAsRole(page, role);
  await use(page);
}

export const test = base.extend({
  anonymousPage: async ({ page }, use) => {
    await page.goto('/login');
    await expect(page.getByRole('heading', { name: 'EduPilot Portal' })).toBeVisible();
    await use(page);
  },
  qaData: async ({}, use) => {
    try {
      await use({ insertQaRow, selectQaRow, trackQaAuthUser });
    } finally {
      await cleanupQaFixtures();
    }
  },
  ownerPage: async ({ page }, use) => makeRoleFixture(page, use, 'owner'),
  adminPage: async ({ page }, use) => makeRoleFixture(page, use, 'admin'),
  teacherPage: async ({ page }, use) => makeRoleFixture(page, use, 'teacher'),
  studentPage: async ({ page }, use) => makeRoleFixture(page, use, 'student'),
});

export { expect };