import { defineConfig } from '@playwright/test';

export default defineConfig({
    testDir: './e2e',
    timeout: 60000,
    retries: 1,
    use: {
        baseURL: 'http://localhost:11048',
        headless: true,
        screenshot: 'only-on-failure',
    },
    webServer: [
        {
            command: 'uv run python -m web_sota.backend.server --port 11049',
            port: 11049,
            cwd: '../',
            timeout: 30000,
            reuseExistingServer: false,
        },
        {
            command: 'npx vite --port 11048 --host',
            port: 11048,
            cwd: '.',
            timeout: 30000,
            reuseExistingServer: false,
        },
    ],
});
