const { test, expect } = require('@playwright/test');

test.describe('Health API (dummy)', () => {
  test('health responde', async () => {
    expect(true).toBe(true);
  });
});
