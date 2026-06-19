import { BatchGetCommand } from "@aws-sdk/lib-dynamodb";
import { createClient } from "../../shared/config.js";
import { signGetUrl } from "../../shared/s3.js";

const dynamo = createClient();

const STUDENT_TABLE = process.env.STUDENT_TABLE ?? "student";
const COACHES_TABLE = process.env.COACHES_TABLE ?? "coaches";

const batchGet = async (table, keys) => {
  if (keys.length === 0) return [];
  const found = [];
  for (let i = 0; i < keys.length; i += 100) {
    const slice = keys.slice(i, i + 100);
    const result = await dynamo.send(
      new BatchGetCommand({ RequestItems: { [table]: { Keys: slice } } })
    );
    found.push(...(result.Responses?.[table] ?? []));
  }
  return found;
};

/**
 * Resolve a foto de perfil (URL assinada) de cada membro do chat. Um membro é
 * aluno OU coach; consultamos as duas tabelas e usamos a que tiver o registro.
 * A key da foto fica no banco (student.photo_key / coach.profile.photo_key) e é
 * assinada a cada leitura — a URL é sempre fresca, nunca um link expirado em cache.
 *
 * @param {string[]} userIds - subs do Cognito (membros das conversas).
 * @returns {Promise<Map<string, string|null>>} id -> photo_url (ou null).
 */
export const resolveMemberImages = async (userIds) => {
  const ids = [...new Set(userIds.filter(Boolean))];
  const images = new Map();
  if (ids.length === 0) return images;

  const [students, coaches] = await Promise.all([
    batchGet(STUDENT_TABLE, ids.map((studentId) => ({ studentId }))),
    batchGet(COACHES_TABLE, ids.map((coachId) => ({ coachId }))),
  ]);

  const photoKeys = new Map();
  for (const student of students) {
    if (student.photo_key) photoKeys.set(student.studentId, student.photo_key);
  }
  for (const coach of coaches) {
    const key = coach.profile?.photo_key;
    if (key) photoKeys.set(coach.coachId, key);
  }

  await Promise.all(
    [...photoKeys].map(async ([id, key]) => {
      images.set(id, await signGetUrl(key));
    })
  );

  return images;
};
