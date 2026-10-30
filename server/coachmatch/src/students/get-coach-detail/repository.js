import { GetCommand, BatchGetCommand } from "@aws-sdk/lib-dynamodb";
import { createClient } from "../../shared/config.js";

const dynamo = createClient();

const COACHES_TABLE = process.env.COACHES_TABLE ?? "coaches";
const GYMS_TABLE = process.env.GYMS_TABLE ?? "gyms";

export async function findCoachById(coachId) {
  const result = await dynamo.send(
    new GetCommand({ TableName: COACHES_TABLE, Key: { coachId } })
  );

  return result.Item ?? null;
}

export async function loadGyms(gymIds) {
  const unique = [...new Set(gymIds.filter(Boolean))];
  const gymsById = new Map();

  if (unique.length === 0) return gymsById;

  const slices = [];
  for (let i = 0; i < unique.length; i += 100) slices.push(unique.slice(i, i + 100));

  const results = await Promise.all(
    slices.map((slice) =>
      dynamo.send(new BatchGetCommand({ RequestItems: { [GYMS_TABLE]: { Keys: slice.map((gymId) => ({ gymId })) } } }))
    ),
  );

  for (const result of results) {
    for (const gym of result.Responses?.[GYMS_TABLE] ?? []) {
      gymsById.set(gym.gymId, gym);
    }
  }

  return gymsById;
}
