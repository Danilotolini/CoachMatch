import { readFileSync } from 'node:fs';
import { describe, it, expect } from 'vitest';
import { parse } from 'yaml';

const HTTP_METHODS = new Set(['get', 'post', 'put', 'patch', 'delete']);

const CLOUDFORMATION_TAGS = [
  { tag: '!Ref', resolve: (v) => v },
  { tag: '!GetAtt', resolve: (v) => v },
  { tag: '!Equals', collection: 'seq', resolve: (v) => v },
];

function loadServerlessRoutes() {
  const source = readFileSync(new URL('../../serverless.yml', import.meta.url), 'utf8');
  const config = parse(source, { customTags: CLOUDFORMATION_TAGS });
  return Object.values(config.functions)
    .flatMap((fn) => fn.events ?? [])
    .filter((event) => event.httpApi)
    .map(({ httpApi }) => `${httpApi.method.toUpperCase()} ${httpApi.path}`)
    .sort();
}

function loadOpenapiRoutes() {
  const source = readFileSync(new URL('../../../../docs/openapi.yaml', import.meta.url), 'utf8');
  const spec = parse(source);
  const routes = [];
  for (const [path, pathItem] of Object.entries(spec.paths ?? {})) {
    for (const [method, operation] of Object.entries(pathItem)) {
      if (HTTP_METHODS.has(method) && !operation['x-not-implemented']) {
        routes.push(`${method.toUpperCase()} ${path}`);
      }
    }
  }
  return routes.sort();
}

describe('contrato de rotas: serverless.yml ↔ openapi.yaml', () => {
  it('toda rota do serverless.yml tem contrato no openapi.yaml', () => {
    const serverless = loadServerlessRoutes();
    const openapi = new Set(loadOpenapiRoutes());
    const missing = serverless.filter((r) => !openapi.has(r));
    expect(missing, 'rotas no serverless.yml sem contrato no openapi.yaml').toEqual([]);
  });

  it('todo contrato do openapi.yaml tem implementação no serverless.yml', () => {
    const openapi = loadOpenapiRoutes();
    const serverless = new Set(loadServerlessRoutes());
    const missing = openapi.filter((r) => !serverless.has(r));
    expect(missing, 'rotas no openapi.yaml sem implementação no serverless.yml').toEqual([]);
  });
});
