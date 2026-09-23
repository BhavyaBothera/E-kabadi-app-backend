import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: [
      'tests/integration/**/*.test.ts',
      'tests/unit/**/*.test.ts',
      'tests/live/**/*.test.ts',
    ],
    globals: true,
    testTimeout: 45000,
    reporters: ['default', 'json'],
    outputFile: {
      json: 'qa-results.json',
    },
    sequence: {
      // Run integration/unit first, live tests last
      setupFiles: 'list',
    },
  },
});
