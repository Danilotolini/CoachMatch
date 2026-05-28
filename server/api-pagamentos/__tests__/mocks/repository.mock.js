const { DynamoDBDocumentClient } = require('@aws-sdk/lib-dynamodb');

const createMockRepository = () => ({
  create: jest.fn(),
  findById: jest.fn(),
  findByCoach: jest.fn(),
  findByStudent: jest.fn(),
  findBySession: jest.fn(),
  updateStatus: jest.fn(),
});

const createMockDynamoDBClient = () => ({
  send: jest.fn(),
});

module.exports = { createMockRepository, createMockDynamoDBClient };
