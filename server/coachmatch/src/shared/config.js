import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { DatabaseConnectionException } from './exceptions.js';

export const createClient = () => {
  try {
    const clientConfig =
      process.env.STAGE === 'local'
        ? {
            region: process.env.REGION,
            endpoint: process.env.ENDPOINT,
            credentials: {
              accessKeyId: process.env.ACCESS_KEY_ID,
              secretAccessKey: process.env.SECRET_ACCESS_KEY,
            },
          }
        : { region: process.env.REGION };

    const client = new DynamoDBClient(clientConfig);
    return DynamoDBDocumentClient.from(client);
  } catch (err) {
    throw new DatabaseConnectionException('Erro ao conectar com o banco de dados', { cause: err });
  }
};
