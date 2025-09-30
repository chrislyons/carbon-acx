import { expect, test, type Page } from '@playwright/test';

const waitForCompute = async (page: Page, action: () => Promise<unknown>) => {
  await Promise.all([
    page.waitForResponse((response) =>
      response.url().includes('/api/compute') && response.request().method() === 'POST'
    ),
    action()
  ]);
};

test.describe('Compute integration', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test('responds to control changes and surfaces references', async ({ page }) => {
    await page.goto('/');

    const datasetLocator = page.getByTestId('dataset-id');
    await expect(datasetLocator).toContainText('sha256:');

    const totalLocator = page.getByTestId('total-emissions-value');
    await expect(totalLocator).toBeVisible();
    const initialTotal = (await totalLocator.textContent())?.trim() ?? '';

    await waitForCompute(page, () =>
      page.getByTestId('days-in-office-slider').fill('5')
    );
    await expect(totalLocator).not.toHaveText(initialTotal);

    await waitForCompute(page, async () => {
      await page.getByTestId('diet-option-vegan').click();
    });

    const referenceItem = page.getByTestId('reference-item').first();
    await expect(referenceItem).toBeVisible();
    await expect(referenceItem).toContainText('[');
  });
});
