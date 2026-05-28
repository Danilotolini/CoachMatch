const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const {
  DynamoDBDocumentClient,
  PutCommand,
  GetCommand,
  UpdateCommand,
  QueryCommand,
} = require('@aws-sdk/lib-dynamodb');

const client = new DynamoDBClient({ region: process.env.AWS_REGION || 'us-east-1' });
const db     = DynamoDBDocumentClient.from(client);

const TABLE = process.env.PAYMENTS_TABLE || 'coachmatch-payments-dev';

// ─── Access patterns ──────────────────────────────────────────────────────────
//
//  PK                        SK                    Uso
//  TRANSACTION#<id>          METADATA              busca por ID
//  COACH#<id>                TRANSACTION#<date>    histórico do coach   (GSI1)
//  STUDENT#<id>              TRANSACTION#<date>    histórico do aluno   (GSI2)
//  SESSION#<id>              TRANSACTION#<id>      transações da sessão (GSI3)

function buildItem(transaction) {
  return {
    PK:      `TRANSACTION#${transaction.transactionId}`,
    SK:      'METADATA',
    GSI1PK:  `COACH#${transaction.coachId}`,
    GSI1SK:  `TRANSACTION#${transaction.createdAt}`,
    GSI2PK:  `STUDENT#${transaction.studentId}`,
    GSI2SK:  `TRANSACTION#${transaction.createdAt}`,
    GSI3PK:  `SESSION#${transaction.sessionId}`,
    GSI3SK:  `TRANSACTION#${transaction.transactionId}`,
    ...transaction,
    updatedAt: new Date().toISOString(),
  };
}

async function create(transaction) {
  const item = buildItem(transaction);
  await db.send(new PutCommand({ TableName: TABLE, Item: item }));
  return item;
}

async function findById(transactionId) {
  const result = await db.send(new GetCommand({
    TableName: TABLE,
    Key: { PK: `TRANSACTION#${transactionId}`, SK: 'METADATA' },
  }));
  return result.Item || null;
}

async function findByCoach(coachId) {
  const result = await db.send(new QueryCommand({
    TableName: TABLE,
    IndexName: 'GSI1',
    KeyConditionExpression: 'GSI1PK = :pk',
    ExpressionAttributeValues: { ':pk': `COACH#${coachId}` },
    ScanIndexForward: false,
  }));
  return result.Items || [];
}

async function findByStudent(studentId) {
  const result = await db.send(new QueryCommand({
    TableName: TABLE,
    IndexName: 'GSI2',
    KeyConditionExpression: 'GSI2PK = :pk',
    ExpressionAttributeValues: { ':pk': `STUDENT#${studentId}` },
    ScanIndexForward: false,
  }));
  return result.Items || [];
}

async function findBySession(sessionId) {
  const result = await db.send(new QueryCommand({
    TableName: TABLE,
    IndexName: 'GSI3',
    KeyConditionExpression: 'GSI3PK = :pk',
    ExpressionAttributeValues: { ':pk': `SESSION#${sessionId}` },
    ScanIndexForward: false,
  }));
  return result.Items || [];
}

async function updateStatus(transactionId, status, extra = {}) {
  await db.send(new UpdateCommand({
    TableName: TABLE,
    Key: { PK: `TRANSACTION#${transactionId}`, SK: 'METADATA' },
    UpdateExpression: 'SET #s = :status, updatedAt = :updatedAt, extra = :extra',
    ExpressionAttributeNames: { '#s': 'status' },
    ExpressionAttributeValues: {
      ':status':    status,
      ':updatedAt': new Date().toISOString(),
      ':extra':     extra,
    },
  }));
}

module.exports = { create, findById, findByCoach, findByStudent, findBySession, updateStatus };