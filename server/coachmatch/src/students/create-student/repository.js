import { PutCommand } from '@aws-sdk/lib-dynamodb';
import { createClient } from '../../shared/config.js';

const TABLE = 'student';

/**
 * Persiste um novo estudante na tabela DynamoDB.
 * @param {object} student - Item completo a ser inserido.
 */
export const insertStudent = async (student) => {
  const docClient = await createClient();
  await docClient.send(new PutCommand({ TableName: TABLE, Item: student }));
};
