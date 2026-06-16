import { ScanCommand } from "@aws-sdk/lib-dynamodb";
import { createClient } from "../../shared/config.js";

const dynamo = createClient();

const TABLE_NAME = process.env.COACHES_TABLE ?? "coaches";

export async function scanCoaches({ q, specialties, limit, lastKey }) {
  const filterExpressions = [];
  const expressionNames   = {};
  const expressionValues  = {};

  if (q) {
    filterExpressions.push(
      "(contains(#name, :q) OR contains(#specialties, :q))"
    );
    expressionNames["#name"]       = "name";
    expressionNames["#specialties"] = "specialties";
    expressionValues[":q"]         = q.toLowerCase();
  }

  if (specialties.length > 0) {
    const conditions = specialties.map((s, i) => {
      expressionValues[`:s${i}`] = s;
      return `contains(#specialties, :s${i})`;
    });
    expressionNames["#specialties"] = "specialties";
    filterExpressions.push(`(${conditions.join(" OR ")})`);
  }

  const params = {
    TableName: TABLE_NAME,
    Limit: limit,
    ...(lastKey && { ExclusiveStartKey: lastKey }),
    ...(filterExpressions.length > 0 && {
      FilterExpression:          filterExpressions.join(" AND "),
      ExpressionAttributeNames:  expressionNames,
      ExpressionAttributeValues: expressionValues,
    }),
  };

  const result = await dynamo.send(new ScanCommand(params));

  return {
    items:   mapItems(result.Items ?? []),
    lastKey: result.LastEvaluatedKey ?? null,
  };
}

function mapItems(items) {
  return items.map((item) => ({
    profile: {
      name:          item.profile?.name          ?? null,
      phone:         item.profile?.phone         ?? null,
      specialties:   item.profile?.specialties   ?? [],
      cref:          item.profile?.cref          ?? null,
      instagram:     item.profile?.instagram     ?? null,
      profile_video: item.profile?.profile_video ?? false,
    },
    work_location: mapWorkLocations(item.work_location ?? []),
  }));
}

function mapWorkLocations(locations) {
  return locations.map((loc) => {
    if (loc.type === "GYM") {
      return { type: "GYM", gymId: loc.gymId ?? null };
    }

    if (loc.type === "HOME_SERVICE") {
      return {
        type: "HOME_SERVICE",
        coverage: {
          city:          loc.coverage?.city          ?? null,
          state:         loc.coverage?.state         ?? null,
          neighborhoods: loc.coverage?.neighborhoods ?? [],
        },
      };
    }

    return loc;
  });
}