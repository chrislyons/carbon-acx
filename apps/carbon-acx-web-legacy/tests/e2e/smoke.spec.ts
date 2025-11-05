import { expect, test } from '@playwright/test';

test.describe('new UI smoke flow', () => {
  test('loads sectors, opens a dataset, and renders references', async ({ page }) => {
    await page.setViewportSize({ width: 960, height: 720 });
    await page.goto('/');

    const navigation = page.getByLabel('Sector navigation');
    await expect(navigation).toBeVisible();

    const firstSector = navigation.getByRole('option').first();
    await firstSector.click();

    const datasetLink = page.getByRole('link', { name: /view dataset/i });
    await expect(datasetLink).toBeVisible();
    await datasetLink.click();

    await page.waitForURL('**/datasets/**');

    const chartImage = page.getByRole('img', { name: /bubble chart/i });
    await expect(chartImage).toBeVisible();

    const toggle = page.getByRole('button', { name: /references/i });
    if ((await toggle.count()) > 0) {
      const expanded = await toggle.first().getAttribute('aria-expanded');
      if (expanded !== 'true') {
        await toggle.first().click();
      }
    }

    const sheet = page.getByRole('dialog');
    if ((await sheet.count()) > 0) {
      await expect(sheet).toBeVisible();
      await expect(sheet.getByRole('listitem').first()).toBeVisible();
    } else {
      const referencesPanel = page.getByRole('complementary', { name: /references/i });
      await expect(referencesPanel).toBeVisible();
      await expect(referencesPanel.getByRole('listitem').first()).toBeVisible();
    }
  });
});
