import { ScanCommand } from "@aws-sdk/lib-dynamodb";
import { docClient } from "./dynamodb-client.js";

const TABLE_NAME = "modalities";

export const listAllModalities = async () => {
  const response = await docClient.send(
    new ScanCommand({ TableName: TABLE_NAME })
  );
  return response.Items ?? [];
};
