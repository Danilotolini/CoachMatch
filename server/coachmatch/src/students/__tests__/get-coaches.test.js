import { describe, it, expect, vi, beforeEach } from 'vitest';

const { sendMock } = vi.hoisted(() => ({ sendMock: vi.fn() }));

vi.mock('../../shared/config.js', () => ({
  createClient: () => ({ send: sendMock }),
}));

import { queryCoaches } from '../get-coaches/repository.js';
import { listCoaches } from '../get-coaches/index.js';
import { handler } from '../get-coaches/handler.js';

// ─── Helpers ─────────────────────────────────────────────────────────────────
const coachMarcos = {
  coachId: 'coach-marcos',
  status: 'APPROVED',
  profile: {
    name: 'Marcos Vieira',
    phone: null,
    specialties: ['Musculação', 'Hipertrofia'],
    cref: 'CREF 1-G/SP',
    instagram: '@marcos',
    profile_video: false,
  },
  work_location: [{ type: 'GYM', gymId: 'gym-pinheiros' }],
};

const coachJulia = {
  coachId: 'coach-julia',
  status: 'APPROVED',
  profile: {
    name: 'Julia Ramos',
    phone: null,
    specialties: ['Funcional'],
    cref: null,
    instagram: null,
    profile_video: false,
  },
  work_location: [],
};

const gymPinheiros = {
  gymId: 'gym-pinheiros',
  name: 'Studio X',
  neighborhood: 'Pinheiros',
  city: 'São Paulo',
  state: 'SP',
};

function setupDynamo({ items = [], lastKey = null, gyms = [] } = {}) {
  sendMock.mockImplementation((command) => {
    if (command.input?.RequestItems) {
      return Promise.resolve({ Responses: { gyms } });
    }
    return Promise.resolve({ Items: items, LastEvaluatedKey: lastKey });
  });
}

const queryCall = () => sendMock.mock.calls.find(([c]) => c.input?.TableName)?.[0];
const batchGetCall = () => sendMock.mock.calls.find(([c]) => c.input?.RequestItems)?.[0];
const names = (result) => result.items.map((item) => item.profile.name);

const baseParams = { q: null, specialties: [], limit: 12, lastKey: null };

// ─── Repository (queryCoaches) ────────────────────────────────────────────────
describe('get-coaches › repository (queryCoaches)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('consulta a GSI de status pegando só APPROVED (filtro e ordenação são da Query)', async () => {
    setupDynamo({ items: [coachJulia, coachMarcos] });

    await queryCoaches({ ...baseParams });

    const input = queryCall().input;
    expect(input.IndexName).toBe('status-coachId-index');
    expect(input.KeyConditionExpression).toBe('#status = :status');
    expect(input.ExpressionAttributeNames['#status']).toBe('status');
    expect(input.ExpressionAttributeValues[':status']).toBe('APPROVED');
  });

  it('mapeia os itens na ordem retornada pela Query e não consulta a tabela de gyms', async () => {
    // A Query já devolve ordenado por coachId (sort key da GSi); o repo confia nisso.
    setupDynamo({ items: [coachJulia, coachMarcos] });

    const result = await queryCoaches({ ...baseParams });

    expect(names(result)).toEqual(['Julia Ramos', 'Marcos Vieira']);
    expect(result.items[1]).toMatchObject({
      coachId: 'coach-marcos',
      profile: { name: 'Marcos Vieira', specialties: ['Musculação', 'Hipertrofia'] },
      work_location: [{ type: 'GYM', gymId: 'gym-pinheiros' }],
    });
    expect(sendMock).toHaveBeenCalledTimes(1);
    expect(batchGetCall()).toBeUndefined();
  });

  it('q casa por nome de forma case-insensitive', async () => {
    setupDynamo({ items: [coachMarcos, coachJulia] });

    const result = await queryCoaches({ ...baseParams, q: 'MARCOS' });

    expect(names(result)).toEqual(['Marcos Vieira']);
  });

  it('q casa por modalidade ignorando acento', async () => {
    setupDynamo({ items: [coachMarcos, coachJulia] });

    const result = await queryCoaches({ ...baseParams, q: 'musculacao' });

    expect(names(result)).toEqual(['Marcos Vieira']);
  });

  it('q casa por bairro da academia (resolvendo o gym via BatchGet)', async () => {
    setupDynamo({ items: [coachMarcos, coachJulia], gyms: [gymPinheiros] });

    const result = await queryCoaches({ ...baseParams, q: 'pinheiros' });

    expect(names(result)).toEqual(['Marcos Vieira']);
    expect(batchGetCall().input.RequestItems.gyms.Keys).toEqual([{ gymId: 'gym-pinheiros' }]);
  });

  it('specialties[] faz match exato de elemento (não substring)', async () => {
    setupDynamo({ items: [coachMarcos, coachJulia] });

    expect(names(await queryCoaches({ ...baseParams, specialties: ['Musculação'] }))).toEqual([
      'Marcos Vieira',
    ]);
    expect(names(await queryCoaches({ ...baseParams, specialties: ['Muscul'] }))).toEqual([]);
    expect(names(await queryCoaches({ ...baseParams, specialties: ['Yoga'] }))).toEqual([]);
  });

  it('combina q e specialties[] em AND', async () => {
    setupDynamo({ items: [coachMarcos, coachJulia] });

    const result = await queryCoaches({ ...baseParams, q: 'julia', specialties: ['Musculação'] });

    expect(names(result)).toEqual([]);
  });

  it('repassa lastKey como ExclusiveStartKey e devolve o LastEvaluatedKey', async () => {
    setupDynamo({ items: [coachMarcos], lastKey: { status: 'APPROVED', coachId: 'coach-marcos' } });

    const result = await queryCoaches({
      ...baseParams,
      lastKey: { status: 'APPROVED', coachId: 'coach-julia' },
    });

    expect(queryCall().input.ExclusiveStartKey).toEqual({ status: 'APPROVED', coachId: 'coach-julia' });
    expect(result.lastKey).toEqual({ status: 'APPROVED', coachId: 'coach-marcos' });
  });
});

// ─── Business Logic (index) ───────────────────────────────────────────────────
describe('get-coaches › index (listCoaches)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('monta o envelope { data, meta } com limit e lastKey', async () => {
    setupDynamo({ items: [coachJulia], lastKey: { coachId: 'coach-julia' } });

    const result = await listCoaches({ ...baseParams, limit: 3 });

    expect(result.data.map((c) => c.profile.name)).toEqual(['Julia Ramos']);
    expect(result.meta).toEqual({ limit: 3, lastKey: { coachId: 'coach-julia' } });
  });

  it('lastKey é null na última página', async () => {
    setupDynamo({ items: [coachJulia], lastKey: null });

    const result = await listCoaches({ ...baseParams });

    expect(result.meta.lastKey).toBeNull();
  });
});

// ─── Handler ─────────────────────────────────────────────────────────────────
describe('get-coaches › handler', () => {
  beforeEach(() => vi.clearAllMocks());

  it('parseia lastKey (JSON), specialties[] e limit, retornando 200 com data/meta', async () => {
    setupDynamo({ items: [coachMarcos, coachJulia] });

    const response = await handler({
      queryStringParameters: { limit: '2', lastKey: JSON.stringify({ coachId: 'coach-x' }) },
      multiValueQueryStringParameters: { 'specialties[]': ['Funcional'] },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.data.map((c) => c.profile.name)).toEqual(['Julia Ramos']);
    expect(body.meta.limit).toBe(2);
    expect(queryCall().input.ExclusiveStartKey).toEqual({ coachId: 'coach-x' });
  });

  it('usa o limit padrão (12) e sem cursor quando não há query string', async () => {
    setupDynamo({ items: [coachMarcos] });

    const response = await handler({});

    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.body).meta.limit).toBe(12);
    expect(queryCall().input.ExclusiveStartKey).toBeUndefined();
  });

  it('retorna 500 quando o repositório falha', async () => {
    sendMock.mockRejectedValue(new Error('DynamoDB indisponível'));

    const response = await handler({ queryStringParameters: { q: 'marcos' } });

    expect(response.statusCode).toBe(500);
    expect(JSON.parse(response.body)).toEqual({ message: 'Erro interno' });
  });
});
