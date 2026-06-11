import { test, expect } from '@playwright/test';

const BE = 'http://127.0.0.1:11049';
const FE = 'http://127.0.0.1:11048';

test.describe('Fleet Audit — isaac-mcp', () => {
    test('Backend health', async ({ request }) => {
        const resp = await request.get(BE + '/health');
        expect(resp.status()).toBe(200);
    });

    test('Frontend loads', async ({ page }) => {
        await page.goto(FE, { timeout: 15000 });
        await page.waitForTimeout(3000);
        await expect(page.locator('#root')).toBeAttached();
    });

    test('No console errors', async ({ page }) => {
        const errors: string[] = [];
        page.on('console', (msg) => {
            if (msg.type() === 'error') errors.push(msg.text());
        });
        await page.goto(FE, { timeout: 15000 });
        await page.waitForTimeout(3000);
        expect(errors.length).toBe(0);
    });

    test('Navigation sidebar works', async ({ page }) => {
        await page.goto(FE, { timeout: 15000 });
        await page.waitForTimeout(2000);
        await expect(page.locator('nav')).toBeAttached();
        await page.locator('nav a').nth(3).click();
        await page.waitForTimeout(1000);
        await expect(page.locator('h1')).toBeAttached();
    });

    test('Dashboard loads with KPIs', async ({ page }) => {
        await page.goto(FE, { timeout: 15000 });
        await page.waitForTimeout(3000);
        await expect(page.locator('h1')).toContainText('Dashboard');
    });

    test('Models page has inputs', async ({ page }) => {
        await page.goto(FE + '/models', { timeout: 15000 });
        await page.waitForTimeout(2000);
        await expect(page.locator('h1')).toContainText('Scene Depot');
        const inputs = page.locator('input');
        const count = await inputs.count();
        expect(count).toBeGreaterThanOrEqual(2);
    });

    test('LLM page renders', async ({ page }) => {
        await page.goto(FE + '/llm', { timeout: 15000 });
        await page.waitForTimeout(2000);
        await expect(page.locator('h1')).toContainText('LLM');
        const textarea = page.locator('textarea');
        await expect(textarea).toBeAttached();
    });
});
