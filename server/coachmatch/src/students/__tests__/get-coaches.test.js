import { describe, it, expect, vi, beforeEach } from 'vitest';

const { sendMock } = vi.hoisted(() => ({ sendMock: vi.fn() }));

vi.mock('../../shared/config.js', () => ({
  createClient: () => ({ send: sendMock }),
}));

import { scanCoaches } from '../get-coaches/repository.js';
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

const scanCall = () => sendMock.mock.calls.find(([c]) => c.input?.TableName)?.[0];
const batchGetCall = () => sendMock.mock.calls.find(([c]) => c.input?.RequestItems)?.[0];
const names = (result) => result.items.map((item) => item.profile.name);

const baseParams = { q: null, specialties: [], limit: 12, lastKey: null };

// ─── Repository (scanCoaches) ─────────────────────────────────────────────────
describe('get-coaches › repository (scanCoaches)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('sem filtros retorna todos mapeados em ordem estável por coachId e não consulta a tabela de gyms', async () => {
    setupDynamo({ items: [coachMarcos, coachJulia] });

    const result = await scanCoaches({ ...baseParams });

    expect(names(result)).toEqual(['Julia Ramos', 'Marcos Vieira']);
    expect(result.items[1]).toMatchObject({
      coachId: 'coach-marcos',
      profile: { name: 'Marcos Vieira', specialties: ['Musculação', 'Hipertrofia'] },
      work_location: [{ type: 'GYM', gymId: 'gym-pinheiros' }],
    });
    expect(sendMock).toHaveBeenCalledTimes(1);
    expect(batchGetCall()).toBeUndefined();
  });

  it('ordena por coachId independente da ordem retornada pelo Scan', async () => {
    setupDynamo({ items: [coachMarcos, coachJulia] });

    const ordered = names(await scanCoaches({ ...baseParams }));

    setupDynamo({ items: [coachJulia, coachMarcos] });
    const reversed = names(await scanCoaches({ ...baseParams }));

    expect(ordered).toEqual(['Julia Ramos', 'Marcos Vieira']);
    expect(reversed).toEqual(ordered);
  });

  it('exclui coaches que não estão APPROVED', async () => {
    const coachPendente = { ...coachMarcos, coachId: 'coach-pendente', status: 'PENDING_REVIEW' };
    setupDynamo({ items: [coachPendente, coachJulia] });

    const result = await scanCoaches({ ...baseParams });

    expect(names(result)).toEqual(['Julia Ramos']);
  });

  it('q casa por nome de forma case-insensitive', async () => {
    setupDynamo({ items: [coachMarcos, coachJulia] });

    const result = await scanCoaches({ ...baseParams, q: 'MARCOS' });

    expect(names(result)).toEqual(['Marcos Vieira']);
  });

  it('q casa por modalidade ignorando acento', async () => {
    setupDynamo({ items: [coachMarcos, coachJulia] });

    const result = await scanCoaches({ ...baseParams, q: 'musculacao' });

    expect(names(result)).toEqual(['Marcos Vieira']);
  });

  it('q casa por bairro da academia (resolvendo o gym via BatchGet)', async () => {
    setupDynamo({ items: [coachMarcos, coachJulia], gyms: [gymPinheiros] });

    const result = await scanCoaches({ ...baseParams, q: 'pinheiros' });

    expect(names(result)).toEqual(['Marcos Vieira']);
    expect(batchGetCall().input.RequestItems.gyms.Keys).toEqual([{ gymId: 'gym-pinheiros' }]);
  });

  it('specialties[] faz match exato de elemento (não substring)', async () => {
    setupDynamo({ items: [coachMarcos, coachJulia] });

    expect(names(await scanCoaches({ ...baseParams, specialties: ['Musculação'] }))).toEqual([
      'Marcos Vieira',
    ]);
    expect(names(await scanCoaches({ ...baseParams, specialties: ['Muscul'] }))).toEqual([]);
    expect(names(await scanCoaches({ ...baseParams, specialties: ['Yoga'] }))).toEqual([]);
  });

  it('combina q e specialties[] em AND', async () => {
    setupDynamo({ items: [coachMarcos, coachJulia] });

    const result = await scanCoaches({ ...baseParams, q: 'julia', specialties: ['Musculação'] });

    expect(names(result)).toEqual([]);
  });

  it('repassa lastKey como ExclusiveStartKey e devolve o LastEvaluatedKey', async () => {
    setupDynamo({ items: [coachMarcos], lastKey: { coachId: 'coach-marcos' } });

    const result = await scanCoaches({ ...baseParams, lastKey: { coachId: 'coach-julia' } });

    expect(scanCall().input.ExclusiveStartKey).toEqual({ coachId: 'coach-julia' });
    expect(result.lastKey).toEqual({ coachId: 'coach-marcos' });
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
    expect(scanCall().input.ExclusiveStartKey).toEqual({ coachId: 'coach-x' });
  });

  it('usa o limit padrão (12) e sem cursor quando não há query string', async () => {
    setupDynamo({ items: [coachMarcos] });

    const response = await handler({});

    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.body).meta.limit).toBe(12);
    expect(scanCall().input.ExclusiveStartKey).toBeUndefined();
  });

  it('retorna 500 quando o repositório falha', async () => {
    sendMock.mockRejectedValue(new Error('DynamoDB indisponível'));

    const response = await handler({ queryStringParameters: { q: 'marcos' } });

    expect(response.statusCode).toBe(500);
    expect(JSON.parse(response.body)).toEqual({ message: 'Erro interno' });
  });
});
