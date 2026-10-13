import { test, expect } from '@playwright/test';
const FE = 'http://127.0.0.1:10949';
const BE = 'http://127.0.0.1:10948';
test.describe('Goose Audit', () => {
    test('Backend health', async ({ request }) => {
        const resp = await request.get(BE + '/api/health');
        expect(resp.status()).toBe(200);
    });
    test('Frontend loads', async ({ page }) => {
        await page.goto(FE, { timeout: 15000 });
        await page.waitForTimeout(3000);
        await expect(page.locator('#root')).toBeAttached();
    });
});
