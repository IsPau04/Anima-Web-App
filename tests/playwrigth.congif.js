// playwright.config.js
const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests',
  timeout: 30 * 1000,
  use: {
    baseURL: 'http://localhost:4000', // ✅ Backend
    extraHTTPHeaders: {
      'Content-Type': 'application/json'
    }
  }
});

