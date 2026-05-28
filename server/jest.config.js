module.exports = {
  testEnvironment: 'node',
  collectCoverageFrom: [
    'api-pagamentos/**/*.js',
    '!api-pagamentos/**/*.test.js',
    '!api-cadastro/**',
  ],
  coveragePathIgnorePatterns: ['/node_modules/'],
  testMatch: ['**/__tests__/**/*.js', '**/*.test.js'],
  clearMocks: true,
  verbose: true,
  transformIgnorePatterns: ['node_modules/(?!(uuid)/)'],
  transform: {
    '^.+\\.js$': 'babel-jest',
  },
};

