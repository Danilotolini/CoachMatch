// Jest config mantido para outros módulos legados em server/.
// Os testes do módulo de pagamentos (coachmatch/src/payments) rodam
// via Vitest em server/coachmatch — veja o vitest.config.js de lá.
module.exports = {
  testEnvironment: 'node',
  collectCoverageFrom: ['**/*.js', '!**/*.test.js', '!**/node_modules/**'],
  coveragePathIgnorePatterns: ['/node_modules/', '/coachmatch/'],
  testMatch: ['**/__tests__/**/*.js', '**/*.test.js'],
  testPathIgnorePatterns: [
    '__tests__/fixtures',
    '__tests__/mocks',
    'coachmatch/',
  ],
  clearMocks: true,
  verbose: true,
  transformIgnorePatterns: ['node_modules/(?!(uuid)/)'],
  transform: {
    '^.+\\.js$': 'babel-jest',
  },
};