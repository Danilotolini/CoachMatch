import { ListTablesCommand, DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { DatabaseConnectionException } from "./api-coach-create/exceptions/DatabaseConnectionException.js";

export const createClient = async () => {
  try {
    let client = null;

    if (process.env.STAGE === "local") {
      client = new DynamoDBClient({
        region: process.env.REGION,
        endpoint: process.env.ENDPOINT,
        credentials: {
          accessKeyId: process.env.ACCESS_KEY_ID,
          secretAccessKey: process.env.SECRET_ACCESS_KEY,
        },
      });
    } else {
      client = new DynamoDBClient({
        region: process.env.REGION,
      });
    }

    const docClient = DynamoDBDocumentClient.from(client);
    return docClient;
  } catch (err) {
    throw new DatabaseConnectionException("Erro ao tentar conectar com o Banco de Dados",{cause:err});
  }
};
