import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    // Os repositórios resolvem o nome da tabela ao serem importados (shared/tables.js).
    env: {
      COACHES_TABLE: 'coaches',
      GYMS_TABLE: 'gyms',
      PAYMENTS_TABLE: 'payments',
      SCHEDULE_TABLE: 'schedule',
      SPECIALTIES_TABLE: 'specialties',
      STUDENTS_TABLE: 'student',
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'clover', 'json', 'lcov'],
      include: ['src/**/*.js'],
      exclude: ['src/**/__tests__/**', 'src/**/repository.js'],
      thresholds: { lines: 80, functions: 80, branches: 70 },
    },
  },
});
