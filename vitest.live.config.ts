import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/live/**/*.test.ts'],
    globals: true,
    testTimeout: 30000, // 30s timeout for live network queries
  },
});
