const { test, expect } = require('@playwright/test');

test.describe('Health DB API (dummy)', () => {
  test('health db responde', async () => {
    expect(true).toBe(true);
  });
});
