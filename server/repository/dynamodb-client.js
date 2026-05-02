import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";

const isLocal = process.env.IS_OFFLINE === "true" || !process.env.AWS_REGION;

const client = new DynamoDBClient(
  isLocal
    ? {
        region: "local",
        endpoint: "http://localhost:8000",
        credentials: {
          accessKeyId: "FAKEID123",
          secretAccessKey: "FAKESECRET123",
        },
      }
    : {}
);

export const docClient = DynamoDBDocumentClient.from(client);
