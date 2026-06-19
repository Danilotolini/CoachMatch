import { describe, it, expect, vi, beforeEach } from 'vitest';

const { sendMock } = vi.hoisted(() => ({ sendMock: vi.fn() }));

vi.mock('../../shared/config.js', () => ({
  createClient: () => ({ send: sendMock }),
}));

vi.mock('../../shared/s3.js', () => ({
  signGetUrl: vi.fn(async (key) => (key ? `https://signed.example/${key}` : null)),
}));

import { findCoachById, loadGyms } from '../get-coach-detail/repository.js';
import { getCoachDetail } from '../get-coach-detail/index.js';
import { handler } from '../get-coach-detail/handler.js';

const coachMarcos = {
  coachId: 'coach-marcos',
  email: 'marcos@coachmatch.app',
  status: 'APPROVED',
  profile: {
    name: 'Marcos Vieira',
    phone: '+5511999999999',
    specialties: ['Musculação', 'Hipertrofia'],
    cref: 'CREF 1-G/SP',
    instagram: '@marcos',
    photo_key: 'uploads/marcos-foto.jpg',
    video_key: 'uploads/marcos-video.mp4',
  },
  work_location: [
    { type: 'GYM', gymId: 'gym-pinheiros' },
    {
      type: 'HOME_SERVICE',
      coverage: { city: 'São Paulo', state: 'SP', neighborhoods: ['Pinheiros'] },
    },
  ],
};

const gymPinheiros = {
  gymId: 'gym-pinheiros',
  name: 'Studio X',
  neighborhood: 'Pinheiros',
  city: 'São Paulo',
  state: 'SP',
};

function setupDynamo({ coach = null, gyms = [] } = {}) {
  sendMock.mockImplementation((command) => {
    if (command.input?.RequestItems) {
      return Promise.resolve({ Responses: { gyms } });
    }
    return Promise.resolve({ Item: coach ?? undefined });
  });
}

const getCall = () => sendMock.mock.calls.find(([c]) => c.input?.Key)?.[0];
const batchGetCall = () => sendMock.mock.calls.find(([c]) => c.input?.RequestItems)?.[0];

describe('get-coach-detail › repository', () => {
  beforeEach(() => vi.clearAllMocks());

  it('findCoachById busca pela chave coachId e devolve o item', async () => {
    setupDynamo({ coach: coachMarcos });

    const item = await findCoachById('coach-marcos');

    expect(getCall().input.Key).toEqual({ coachId: 'coach-marcos' });
    expect(item).toEqual(coachMarcos);
  });

  it('findCoachById devolve null quando não há item', async () => {
    setupDynamo({ coach: null });

    expect(await findCoachById('inexistente')).toBeNull();
  });

  it('loadGyms não consulta o DynamoDB quando não há ids', async () => {
    setupDynamo();

    const gyms = await loadGyms([]);

    expect(gyms.size).toBe(0);
    expect(sendMock).not.toHaveBeenCalled();
  });

  it('loadGyms resolve os gyms por id ignorando duplicados', async () => {
    setupDynamo({ gyms: [gymPinheiros] });

    const gyms = await loadGyms(['gym-pinheiros', 'gym-pinheiros']);

    expect(batchGetCall().input.RequestItems.gyms.Keys).toEqual([{ gymId: 'gym-pinheiros' }]);
    expect(gyms.get('gym-pinheiros')).toEqual(gymPinheiros);
  });
});

describe('get-coach-detail › index (getCoachDetail)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('mapeia o treinador sem expor dados sensíveis e enriquece o gym', async () => {
    setupDynamo({ coach: coachMarcos, gyms: [gymPinheiros] });

    const detail = await getCoachDetail('coach-marcos');

    expect(detail).toEqual({
      coachId: 'coach-marcos',
      status: 'APPROVED',
      profile: {
        name: 'Marcos Vieira',
        phone: '+5511999999999',
        specialties: ['Musculação', 'Hipertrofia'],
        cref: 'CREF 1-G/SP',
        instagram: '@marcos',
        photo_url: 'https://signed.example/uploads/marcos-foto.jpg',
        video_url: 'https://signed.example/uploads/marcos-video.mp4',
      },
      work_location: [
        {
          type: 'GYM',
          gymId: 'gym-pinheiros',
          gym: { name: 'Studio X', neighborhood: 'Pinheiros', city: 'São Paulo', state: 'SP' },
        },
        {
          type: 'HOME_SERVICE',
          coverage: { city: 'São Paulo', state: 'SP', neighborhoods: ['Pinheiros'] },
        },
      ],
    });
    expect(detail.profile).not.toHaveProperty('email');
    expect(detail).not.toHaveProperty('email');
  });

  it('gym fica null quando não é encontrado na tabela de gyms', async () => {
    setupDynamo({ coach: coachMarcos, gyms: [] });

    const detail = await getCoachDetail('coach-marcos');

    expect(detail.work_location[0]).toEqual({
      type: 'GYM',
      gymId: 'gym-pinheiros',
      gym: null,
    });
  });

  it('lança NotFoundException quando o treinador não existe', async () => {
    setupDynamo({ coach: null });

    await expect(getCoachDetail('inexistente')).rejects.toMatchObject({
      name: 'NotFoundException',
    });
  });

  it('lança NotFoundException quando o treinador não está APPROVED', async () => {
    setupDynamo({ coach: { ...coachMarcos, status: 'PENDING_PROFILE' } });

    await expect(getCoachDetail('coach-marcos')).rejects.toMatchObject({
      name: 'NotFoundException',
    });
  });
});

describe('get-coach-detail › handler', () => {
  beforeEach(() => vi.clearAllMocks());

  it('retorna 200 com o detalhe do treinador', async () => {
    setupDynamo({ coach: coachMarcos, gyms: [gymPinheiros] });

    const response = await handler({ pathParameters: { coachId: 'coach-marcos' } });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.coachId).toBe('coach-marcos');
    expect(body.profile.name).toBe('Marcos Vieira');
  });

  it('retorna 400 quando coachId está ausente', async () => {
    const response = await handler({});

    expect(response.statusCode).toBe(400);
    expect(sendMock).not.toHaveBeenCalled();
  });

  it('retorna 404 quando o treinador não é encontrado', async () => {
    setupDynamo({ coach: null });

    const response = await handler({ pathParameters: { coachId: 'inexistente' } });

    expect(response.statusCode).toBe(404);
  });

  it('retorna 500 quando o repositório falha', async () => {
    sendMock.mockRejectedValue(new Error('DynamoDB indisponível'));

    const response = await handler({ pathParameters: { coachId: 'coach-marcos' } });

    expect(response.statusCode).toBe(500);
    expect(JSON.parse(response.body)).toEqual({ message: 'Erro interno' });
  });
});
