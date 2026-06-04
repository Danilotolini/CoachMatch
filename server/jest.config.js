module.exports = {
  testEnvironment: 'node',
  collectCoverageFrom: [
    'api-pagamentos/**/*.js',
    '!api-pagamentos/**/*.test.js',
    '!api-cadastro/**',
  ],
  coveragePathIgnorePatterns: ['/node_modules/'],
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