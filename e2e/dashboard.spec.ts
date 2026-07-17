import { expect, test } from '@playwright/test';

test('a first-time user sees the empty state and can add a tax user', async ({ page }) => {
  await page.goto('/');

  // Acceptance criterion 1: an empty state explaining what Fisqo does.
  await expect(page.getByRole('heading', { name: /no tax users yet/i })).toBeVisible();
  await expect(page.getByText(/income tax return/i)).toBeVisible();

  // Acceptance criterion 2: the button is visible in the empty state.
  const addButton = page.getByRole('button', { name: /add new tax user/i });
  await expect(addButton).toBeVisible();

  // Acceptance criterion 3: clicking it opens the new tax user flow.
  await addButton.click();
  await expect(page.getByRole('heading', { name: /add new tax user/i })).toBeVisible();

  await page.getByLabel(/pan/i).fill('ABCDE1234F');
  await page.getByLabel(/date of birth/i).fill('1985-03-15');
  await page.getByRole('button', { name: /save/i }).click();

  // The tax user section appears, headed by PAN.
  await expect(page.getByRole('heading', { name: 'ABCDE1234F' })).toBeVisible();
  await expect(page.getByText(/no filings yet/i)).toBeVisible();
  await expect(page.getByRole('heading', { name: /no tax users yet/i })).toBeHidden();

  // Acceptance criterion 2 again: the button is visible in the non-empty state.
  await expect(addButton).toBeVisible();
});

test('adding a PAN that already exists reports an error rather than duplicating it', async ({ page }) => {
  await page.goto('/');

  await page.getByRole('button', { name: /add new tax user/i }).click();
  await page.getByLabel(/pan/i).fill('ZZZZZ9999Z');
  await page.getByLabel(/date of birth/i).fill('1990-01-01');
  await page.getByRole('button', { name: /save/i }).click();
  await expect(page.getByRole('heading', { name: 'ZZZZZ9999Z' })).toBeVisible();

  await page.getByRole('button', { name: /add new tax user/i }).click();
  await page.getByLabel(/pan/i).fill('ZZZZZ9999Z');
  await page.getByLabel(/date of birth/i).fill('1991-02-02');
  await page.getByRole('button', { name: /save/i }).click();

  await expect(page.getByRole('alert')).toContainText(/already exists/i);
  await expect(page.getByRole('heading', { name: 'ZZZZZ9999Z' })).toHaveCount(1);
});
