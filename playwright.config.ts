import { defineConfig } from '@playwright/test'
export default defineConfig({ testDir: './e2e', workers: 1, use: { channel: 'chrome', baseURL: 'http://127.0.0.1:4195' }, webServer: { command: 'npm run dev -- --host 127.0.0.1 --port 4195 --strictPort', url: 'http://127.0.0.1:4195', reuseExistingServer: true } })
