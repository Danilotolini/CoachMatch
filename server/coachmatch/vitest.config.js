import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'clover', 'json', 'lcov'],
      include: ['src/**/*.js'],
      exclude: ['src/**/__tests__/**', 'src/**/repository.js'],
      thresholds: { lines: 80, functions: 80, branches: 70 },
    },
  },
});
