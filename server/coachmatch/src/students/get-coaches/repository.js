import { ScanCommand, BatchGetCommand } from "@aws-sdk/lib-dynamodb";
import { createClient } from "../../shared/config.js";

const dynamo = createClient();

const TABLE_NAME = process.env.COACHES_TABLE ?? "coaches";
const GYMS_TABLE = process.env.GYMS_TABLE ?? "gyms";

export async function scanCoaches({ q, specialties, limit, lastKey }) {
  const result = await dynamo.send(
    new ScanCommand({
      TableName: TABLE_NAME,
      Limit: limit,
      ...(lastKey && { ExclusiveStartKey: lastKey }),
    })
  );

  const items = result.Items ?? [];
  const gymsById = q ? await loadGyms(collectGymIds(items)) : new Map();
  const filtered = filterCoaches(items, { q, specialties, gymsById });
  const ordered = sortByCoachId(filtered);

  return {
    items:   mapItems(ordered),
    lastKey: result.LastEvaluatedKey ?? null,
  };
}

function isSearchable(item) {
  return item.status === "APPROVED";
}

// Ordem estável por coachId para que a mesma página sempre volte na mesma ordem
// (o Scan do DynamoDB não garante ordenação).
function sortByCoachId(items) {
  return [...items].sort((a, b) =>
    (a.coachId ?? "").localeCompare(b.coachId ?? "")
  );
}

function normalize(value) {
  return (value ?? "")
    .toString()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

function collectGymIds(items) {
  const ids = [];
  for (const item of items) {
    for (const loc of item.work_location ?? []) {
      if (loc.type === "GYM" && loc.gymId) ids.push(loc.gymId);
    }
  }
  return ids;
}

async function loadGyms(gymIds) {
  const unique = [...new Set(gymIds)];
  const gymsById = new Map();

  for (let i = 0; i < unique.length; i += 100) {
    const keys = unique.slice(i, i + 100).map((gymId) => ({ gymId }));
    const result = await dynamo.send(
      new BatchGetCommand({ RequestItems: { [GYMS_TABLE]: { Keys: keys } } })
    );
    for (const gym of result.Responses?.[GYMS_TABLE] ?? []) {
      gymsById.set(gym.gymId, gym);
    }
  }

  return gymsById;
}

function coachNeighborhoods(item, gymsById) {
  const neighborhoods = [];
  for (const loc of item.work_location ?? []) {
    if (loc.type === "GYM" && loc.gymId) {
      const gym = gymsById.get(loc.gymId);
      if (gym?.neighborhood) neighborhoods.push(gym.neighborhood);
    }
  }
  return neighborhoods;
}

function filterCoaches(items, { q, specialties, gymsById }) {
  const term   = q ? normalize(q) : null;
  const wanted = specialties ?? [];

  return items.filter((item) => {
    if (!isSearchable(item)) return false;

    const coachSpecs = item.profile?.specialties ?? [];

    const matchesQuery =
      !term ||
      normalize(item.profile?.name).includes(term) ||
      coachSpecs.some((spec) => normalize(spec).includes(term)) ||
      coachNeighborhoods(item, gymsById).some((bairro) => normalize(bairro).includes(term));

    const matchesSpecialties =
      wanted.length === 0 ||
      wanted.some((specialty) => coachSpecs.includes(specialty));

    return matchesQuery && matchesSpecialties;
  });
}

function mapItems(items) {
  return items.map((item) => ({
    coachId: item.coachId ?? null,
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