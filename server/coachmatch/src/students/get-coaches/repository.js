import { QueryCommand, BatchGetCommand } from "@aws-sdk/lib-dynamodb";
import { createClient } from "../../shared/config.js";
import { signGetUrl } from "../../shared/s3.js";

const dynamo = createClient();

const TABLE_NAME = process.env.COACHES_TABLE ?? "coaches";
const GYMS_TABLE = process.env.GYMS_TABLE ?? "gyms";
const STATUS_INDEX = process.env.COACHES_STATUS_INDEX ?? "status-coachId-index";
const SEARCHABLE_STATUS = "APPROVED";

// q e specialties são aplicados em memória, então uma página varrida precisa de
// um teto de itens para não estourar latência/leitura quando o filtro é seletivo.
const MAX_FILTER_PAGES = 8;

function runQuery({ limit, lastKey }) {
  return dynamo.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      IndexName: STATUS_INDEX,
      KeyConditionExpression: "#status = :status",
      ExpressionAttributeNames:  { "#status": "status" },
      ExpressionAttributeValues: { ":status": SEARCHABLE_STATUS },
      Limit: limit,
      ...(lastKey && { ExclusiveStartKey: lastKey }),
    })
  );
}

export async function queryCoaches({ q, specialties, limit, lastKey }) {
  const hasFilter = Boolean(q) || (specialties?.length ?? 0) > 0;

  // Sem filtro, a Query já entrega exatamente a página pedida.
  if (!hasFilter) {
    const result = await runQuery({ limit, lastKey });
    return {
      items:   await mapItems(result.Items ?? []),
      lastKey: result.LastEvaluatedKey ?? null,
    };
  }

  // Com filtro em memória, o Limit do DynamoDB conta itens lidos — não itens que
  // passam no filtro. Varremos páginas inteiras até juntar `limit` matches, sem
  // descartar excedentes, para que o cursor caia numa borda de página (sem pular
  // nem duplicar coaches na próxima requisição).
  const matches = [];
  let cursor = lastKey;
  let pages  = 0;

  do {
    const result   = await runQuery({ limit, lastKey: cursor });
    const items    = result.Items ?? [];
    const gymsById = q ? await loadGyms(collectGymIds(items)) : new Map();

    matches.push(...filterCoaches(items, { q, specialties, gymsById }));
    cursor = result.LastEvaluatedKey ?? null;
    pages += 1;
  } while (cursor && matches.length < limit && pages < MAX_FILTER_PAGES);

  return {
    items:   await mapItems(matches),
    lastKey: cursor,
  };
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
  return Promise.all(
    items.map(async (item) => {
      const [photo_url, video_url] = await Promise.all([
        signGetUrl(item.profile?.photo_key),
        signGetUrl(item.profile?.video_key),
      ]);

      return {
        coachId: item.coachId ?? null,
        profile: {
          name:        item.profile?.name        ?? null,
          phone:       item.profile?.phone        ?? null,
          specialties: item.profile?.specialties  ?? [],
          cref:        item.profile?.cref         ?? null,
          instagram:   item.profile?.instagram    ?? null,
          photo_url,
          video_url,
        },
        work_location: mapWorkLocations(item.work_location ?? []),
      };
    })
  );
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