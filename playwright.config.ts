import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
 testDir: './tests',
 fullyParallel: true,
 forbidOnly: !!process.env.CI,
 retries: process.env.CI ? 1 : 0,
 workers: process.env.CI ? 2 : 4,
 timeout: 60_000,
 expect: { timeout: 5_000, toHaveScreenshot: { animations:'disabled', maxDiffPixelRatio:0.001 } },
 reporter: [['list'],['html',{open:'never'}]],
 use: {
  baseURL:'http://127.0.0.1:4173',
  viewport:{width:1440,height:960},
  deviceScaleFactor:1,
  colorScheme:'dark',
  locale:'en-US',
  timezoneId:'UTC',
  reducedMotion:'reduce',
  trace:'retain-on-failure',
  screenshot:'only-on-failure',
 },
 projects:[{name:'chromium',use:{...devices['Desktop Chrome'],viewport:{width:1440,height:960}}},{name:'webkit-popovers',testMatch:'**/popovers.spec.ts',use:{...devices['Desktop Safari'],browserName:'webkit',viewport:{width:1440,height:960}}}],
 webServer:{
  command:'npm run build && npm run preview -- --host 0.0.0.0 --port 4173 --strictPort',
  url:'http://127.0.0.1:4173',
  reuseExistingServer:false,
  timeout:120_000,
 },
});
