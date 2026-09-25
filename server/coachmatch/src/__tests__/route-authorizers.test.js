import { readFileSync } from 'node:fs';
import { describe, it, expect } from 'vitest';
import { parse } from 'yaml';

const COACH = '${self:custom.coachAuthorizer.${sls:stage}}';
const STUDENT = '${self:custom.studentAuthorizer.${sls:stage}}';

// Rotas fora de /coach e /student não indicam o perfil pelo path. Rota nova fora desses
// prefixos falha até entrar aqui, para que quem a cria decida o perfil explicitamente.
const EXCEPTIONS = {
  'POST /payments': STUDENT,
  'GET /payments/{transactionId}': STUDENT,
  'POST /payments/{transactionId}/refund': STUDENT,
  'GET /payments/coach/{coachId}': COACH,
  'GET /payments/session/{sessionId}': STUDENT,
  'GET /payments/student/{studentId}': STUDENT,
};

// As tags intrínsecas do CloudFormation só importam no deploy; aqui basta que o parse não falhe.
const CLOUDFORMATION_TAGS = [
  { tag: '!Ref', resolve: (value) => value },
  { tag: '!GetAtt', resolve: (value) => value },
  { tag: '!Equals', collection: 'seq', resolve: (value) => value },
];

function loadServerlessConfig() {
  const source = readFileSync(new URL('../../serverless.yml', import.meta.url), 'utf8');
  return parse(source, { customTags: CLOUDFORMATION_TAGS });
}

function declaredRouteAuthorizers(config) {
  const routes = Object.values(config.functions)
    .flatMap((fn) => fn.events ?? [])
    .filter((event) => event.httpApi)
    .map(({ httpApi }) => [`${httpApi.method} ${httpApi.path}`, httpApi.authorizer]);
  return Object.fromEntries(routes);
}

function expectedAuthorizer(route) {
  const path = route.split(' ')[1];
  if (path.startsWith('/coach/')) return COACH;
  if (path.startsWith('/student/')) return STUDENT;
  return EXCEPTIONS[route];
}

describe('autorização das rotas do HTTP API', () => {
  it('cada rota usa o authorizer do perfil esperado', () => {
    const declared = declaredRouteAuthorizers(loadServerlessConfig());
    const expected = Object.fromEntries(
      Object.keys(declared).map((route) => [route, expectedAuthorizer(route)]),
    );
    expect(declared).toEqual(expected);
  });
});
