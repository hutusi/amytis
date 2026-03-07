import { defineConfig, devices } from '@playwright/test';

/**
 * Mobile compatibility test configuration.
 * Covers Apple (iPhone SE → Pro Max, iPad), Google Pixel, Samsung Galaxy,
 * and major Chinese Android brands (Huawei, Xiaomi, Oppo, Vivo).
 */
export default defineConfig({
  testDir: './tests/e2e/mobile',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: [['html', { outputFolder: 'playwright-report' }], ['list']],

  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    // ─── Apple iPhone ────────────────────────────────────────────────────────
    {
      name: 'iPhone SE',
      use: { ...devices['iPhone SE'] }, // 375×667, WebKit
    },
    {
      name: 'iPhone 14 Pro',
      use: { ...devices['iPhone 14 Pro'] }, // 393×852, WebKit
    },
    {
      name: 'iPhone 14 Pro Max',
      use: { ...devices['iPhone 14 Pro Max'] }, // 430×932, WebKit
    },

    // ─── Apple iPad ──────────────────────────────────────────────────────────
    {
      name: 'iPad Mini',
      use: { ...devices['iPad Mini'] }, // 768×1024, WebKit
    },
    {
      name: 'iPad Pro 11',
      use: { ...devices['iPad Pro 11'] }, // 834×1194, WebKit
    },

    // ─── Google ──────────────────────────────────────────────────────────────
    {
      name: 'Pixel 5',
      use: { ...devices['Pixel 5'] }, // 393×851, Chromium
    },
    {
      name: 'Pixel 7',
      use: { ...devices['Pixel 7'] }, // 412×915, Chromium
    },

    // ─── Samsung ─────────────────────────────────────────────────────────────
    {
      name: 'Galaxy S8',
      use: { ...devices['Galaxy S8'] }, // 360×740, Chromium
    },
    {
      name: 'Galaxy S21',
      use: {
        userAgent:
          'Mozilla/5.0 (Linux; Android 12; SM-G991B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Mobile Safari/537.36',
        viewport: { width: 360, height: 800 },
        deviceScaleFactor: 3,
        isMobile: true,
        hasTouch: true,
        defaultBrowserType: 'chromium',
      },
    },

    // ─── Huawei ──────────────────────────────────────────────────────────────
    {
      name: 'Huawei P50 Pro',
      use: {
        userAgent:
          'Mozilla/5.0 (Linux; Android 12; HMA-LX9) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Mobile Safari/537.36',
        viewport: { width: 360, height: 800 },
        deviceScaleFactor: 3,
        isMobile: true,
        hasTouch: true,
        defaultBrowserType: 'chromium',
      },
    },
    {
      name: 'Huawei Mate 60',
      use: {
        userAgent:
          'Mozilla/5.0 (Linux; Android 13; BRA-AL00) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Mobile Safari/537.36',
        viewport: { width: 393, height: 873 },
        deviceScaleFactor: 3,
        isMobile: true,
        hasTouch: true,
        defaultBrowserType: 'chromium',
      },
    },

    // ─── Xiaomi ──────────────────────────────────────────────────────────────
    {
      name: 'Xiaomi 14',
      use: {
        userAgent:
          'Mozilla/5.0 (Linux; Android 14; 2312DRAAl) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Mobile Safari/537.36',
        viewport: { width: 393, height: 873 },
        deviceScaleFactor: 3,
        isMobile: true,
        hasTouch: true,
        defaultBrowserType: 'chromium',
      },
    },
    {
      name: 'Redmi Note 13',
      use: {
        userAgent:
          'Mozilla/5.0 (Linux; Android 13; 23117RA68G) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Mobile Safari/537.36',
        viewport: { width: 360, height: 800 },
        deviceScaleFactor: 2.75,
        isMobile: true,
        hasTouch: true,
        defaultBrowserType: 'chromium',
      },
    },

    // ─── Oppo ────────────────────────────────────────────────────────────────
    {
      name: 'Oppo Find X7',
      use: {
        userAgent:
          'Mozilla/5.0 (Linux; Android 14; PHB110) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Mobile Safari/537.36',
        viewport: { width: 393, height: 873 },
        deviceScaleFactor: 3,
        isMobile: true,
        hasTouch: true,
        defaultBrowserType: 'chromium',
      },
    },
    {
      name: 'Oppo Reno 11',
      use: {
        userAgent:
          'Mozilla/5.0 (Linux; Android 13; CPH2599) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Mobile Safari/537.36',
        viewport: { width: 360, height: 780 },
        deviceScaleFactor: 3,
        isMobile: true,
        hasTouch: true,
        defaultBrowserType: 'chromium',
      },
    },

    // ─── Vivo ────────────────────────────────────────────────────────────────
    {
      name: 'Vivo X100',
      use: {
        userAgent:
          'Mozilla/5.0 (Linux; Android 14; V2309A) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Mobile Safari/537.36',
        viewport: { width: 393, height: 873 },
        deviceScaleFactor: 3,
        isMobile: true,
        hasTouch: true,
        defaultBrowserType: 'chromium',
      },
    },
    {
      name: 'Vivo Y100',
      use: {
        userAgent:
          'Mozilla/5.0 (Linux; Android 13; V2302A) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Mobile Safari/537.36',
        viewport: { width: 360, height: 800 },
        deviceScaleFactor: 3,
        isMobile: true,
        hasTouch: true,
        defaultBrowserType: 'chromium',
      },
    },
  ],

  webServer: {
    command: 'bun dev',
    url: 'http://localhost:3000',
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
