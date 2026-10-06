import { test, expect } from '../fixtures/rolePages.js';

test('owner can open dashboard and student-only route is denied', async ({ ownerPage }) => {
  await expect(ownerPage).toHaveURL(/\/dashboard$/);
  await ownerPage.goto('/student');
  await expect(ownerPage).toHaveURL(/\/dashboard$/);
});

test('admin can open the shared management dashboard', async ({ adminPage }) => {
  await expect(adminPage).toHaveURL(/\/dashboard$/);
});

test('teacher opens teacher dashboard and cannot open admin roster', async ({ teacherPage }) => {
  await expect(teacherPage).toHaveURL(/\/teacher$/);
  await teacherPage.goto('/students');
  await expect(teacherPage).toHaveURL(/\/teacher$/);
});

test('student opens student dashboard and cannot open finance', async ({ studentPage }) => {
  await expect(studentPage).toHaveURL(/\/student$/);
  await studentPage.goto('/finance');
  await expect(studentPage).toHaveURL(/\/student$/);
});