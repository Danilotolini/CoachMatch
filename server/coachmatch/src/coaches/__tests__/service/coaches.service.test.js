import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../repository/coaches.repository.js', () => ({
  insertCoach: vi.fn(),
  findCoachById: vi.fn(),
  updateCoach: vi.fn(),
}));

import { createCoach, getCoach, updateCoachProfile } from '../../service/coaches.service.js';
import { insertCoach, findCoachById, updateCoach } from '../../repository/coaches.repository.js';
import { ValidationException } from '../../../shared/exceptions.js';

const validCognitoAttributes = {
  sub: '123e4567-e89b-12d3-a456-426614174000',
  email: 'coach@mail.com',
  name: 'João Silva',
};

const validUpdatePayload = {
  profile: {
    name: 'João Silva',
    phone: '11999999999',
    specialties: ['Musculação'],
    cref: 'CREF 123456-G/SP',
    instagram: '@joaocoach',
    profile_video: false,
  },
  work_location: [{ type: 'GYM', gymId: 'gym-abc' }],
};

describe('createCoach', () => {
  beforeEach(() => vi.clearAllMocks());

  it('insere coach com status PENDING_PROFILE', async () => {
    await createCoach(validCognitoAttributes);
    expect(insertCoach).toHaveBeenCalledWith({
      coachId: validCognitoAttributes.sub,
      email: validCognitoAttributes.email,
      status: 'PENDING_PROFILE',
      profile: { name: validCognitoAttributes.name },
    });
  });

  it('lança ValidationException quando sub não é UUID', async () => {
    await expect(createCoach({ ...validCognitoAttributes, sub: 'invalido' }))
      .rejects.toThrow(ValidationException);
  });

  it('lança ValidationException quando email é inválido', async () => {
    await expect(createCoach({ ...validCognitoAttributes, email: 'semdominio' }))
      .rejects.toThrow(ValidationException);
  });

  it('não chama insertCoach quando validação falha', async () => {
    await expect(createCoach({ sub: 'x', email: 'x', name: '' })).rejects.toThrow();
    expect(insertCoach).not.toHaveBeenCalled();
  });

  it('propaga erro do repositório', async () => {
    insertCoach.mockRejectedValue(new Error('DynamoDB indisponível'));
    await expect(createCoach(validCognitoAttributes)).rejects.toThrow('DynamoDB indisponível');
  });
});

describe('getCoach', () => {
  beforeEach(() => vi.clearAllMocks());

  it('retorna o coach do repositório', async () => {
    const mockCoach = { coachId: 'abc', email: 'x@x.com', status: 'PENDING_PROFILE' };
    findCoachById.mockResolvedValue(mockCoach);
    const result = await getCoach('abc');
    expect(findCoachById).toHaveBeenCalledWith('abc');
    expect(result).toBe(mockCoach);
  });

  it('retorna null quando coach não existe', async () => {
    findCoachById.mockResolvedValue(null);
    expect(await getCoach('nao-existe')).toBeNull();
  });
});

describe('updateCoachProfile', () => {
  beforeEach(() => vi.clearAllMocks());

  it('atualiza perfil com newStatus', async () => {
    await updateCoachProfile('coach-123', validUpdatePayload, 'PENDING_REVIEW');
    expect(updateCoach).toHaveBeenCalledWith('coach-123', {
      ...validUpdatePayload,
      status: 'PENDING_REVIEW',
    });
  });

  it('passa newStatus undefined quando não fornecido', async () => {
    await updateCoachProfile('coach-123', validUpdatePayload, undefined);
    expect(updateCoach).toHaveBeenCalledWith('coach-123', {
      ...validUpdatePayload,
      status: undefined,
    });
  });

  it('lança ValidationException com CREF inválido', async () => {
    const bad = { ...validUpdatePayload, profile: { ...validUpdatePayload.profile, cref: 'invalido' } };
    await expect(updateCoachProfile('coach-123', bad, 'PENDING_REVIEW')).rejects.toThrow(ValidationException);
  });

  it('lança ValidationException com HOME_SERVICE sem serviceRadius', async () => {
    const bad = { ...validUpdatePayload, work_location: [{ type: 'HOME_SERVICE' }] };
    await expect(updateCoachProfile('coach-123', bad, 'PENDING_REVIEW')).rejects.toThrow(ValidationException);
  });

  it('aceita HOME_SERVICE com serviceRadius válido', async () => {
    const payload = { ...validUpdatePayload, work_location: [{ type: 'HOME_SERVICE', serviceRadius: 25 }] };
    await updateCoachProfile('coach-123', payload, 'PENDING_REVIEW');
    expect(updateCoach).toHaveBeenCalled();
  });

  it('não chama updateCoach quando validação falha', async () => {
    await expect(updateCoachProfile('x', { profile: {}, work_location: [] }, 'X')).rejects.toThrow();
    expect(updateCoach).not.toHaveBeenCalled();
  });

  it('propaga erro do repositório', async () => {
    updateCoach.mockRejectedValue(new Error('Falha na atualização'));
    await expect(updateCoachProfile('coach-123', validUpdatePayload, 'PENDING_REVIEW'))
      .rejects.toThrow('Falha na atualização');
  });
});
