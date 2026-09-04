import { logger } from './logger.js';
import { findStudentById } from '../students/get-student/repository.js';
import { findCoachById } from '../coaches/get-coach/repository.js';
import { createStudent } from '../students/create-student/index.js';
import { createCoach } from '../coaches/create-coach/index.js';

const ROLES = {
  student: { find: findStudentById, create: createStudent },
  coach:   { find: findCoachById,   create: createCoach },
};

/**
 * Deriva o nome a partir das claims do ID token.
 * Nem todo usuário do pool tem o atributo `name` preenchido — o próprio front-end
 * cai para given_name/family_name (ver client/src/lib/auth.ts). O e-mail é o último
 * recurso porque os schemas de criação exigem uma string.
 *
 * @param {object} claims - Claims do ID token do Cognito.
 * @returns {string}
 */
const claimName = (claims) => {
  const fullName = [claims.given_name, claims.family_name].filter(Boolean).join(' ');
  return claims.name ?? (fullName || claims.email);
};

/**
 * Cria o registro do usuário no banco local quando ele ainda não existe.
 *
 * O trigger PostConfirmation do Cognito roda na AWS, não contra o serverless-offline,
 * então quem autentica localmente nunca ganha registro em `student`/`coaches` e o
 * front-end fica preso na tela de onboarding. Aqui recriamos o mesmo registro a partir
 * das claims do ID token — sub, email e name, os campos que o trigger receberia, já
 * chegam em toda requisição.
 *
 * No-op fora da stage local: `STAGE` é a mesma chave que shared/config.js usa para
 * decidir entre o DynamoDB Local e a AWS.
 *
 * @param {'student'|'coach'} role
 * @param {object} event - Evento HTTP do API Gateway.
 */
export const ensureLocalRecord = async (role, event) => {
  if (process.env.STAGE !== 'local') return;

  const claims = event?.requestContext?.authorizer?.jwt?.claims;
  if (!claims?.sub) return;

  const { find, create } = ROLES[role];

  try {
    // A criação usa PutCommand, que sobrescreve o item inteiro: sem esta checagem
    // todo GET zeraria o progresso do onboarding.
    if (await find(claims.sub)) return;

    await create({ sub: claims.sub, email: claims.email, name: claimName(claims) });
    logger.info('local_autoseed_created', { role, userId: claims.sub });
  } catch (err) {
    // Falhar aqui não pode derrubar o request: sem o registro o handler segue para o
    // 404 normal. O log é o que explica por que o onboarding continua travado — foi
    // justamente o silêncio que tornou esse bug difícil de diagnosticar.
    logger.warn('local_autoseed_failed', {
      role,
      userId: claims.sub,
      error: err?.message ?? String(err),
    });
  }
};
