import { GetCommand } from '@aws-sdk/lib-dynamodb';
import { createClient } from '../../shared/config.js';
import { tableName } from '../../shared/tables.js';

const TABLE = tableName('students');

/**
 * Busca um estudante pelo ID no DynamoDB.
 * @param {string} studentId
 * @returns {object|null} Registro do estudante ou null se não encontrado.
 */
export const findStudentById = async (studentId) => {
  const docClient = createClient();
  const result = await docClient.send(
    new GetCommand({ TableName: TABLE, Key: { studentId } })
  );
  return result.Item ?? null;
};
