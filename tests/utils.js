const { expect } = require('@playwright/test');
const selectors = require('./selectors');

async function login(page, { email = 'test@anima.com', password = 'Password123!' } = {}) {
  await page.goto('/login');

  await page.fill(selectors.login.email, email);
  await page.fill(selectors.login.password, password);
  await page.click(selectors.login.button);

  await expect(page).toHaveURL(/dashboard/i);
  await expect(page.locator(selectors.dashboard.root)).toBeVisible();
}

module.exports = { login };

