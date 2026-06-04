import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../repository/coaches.repository.js', () => ({
  insertCoach: vi.fn(),
  updateCoach: vi.fn(),
}));

import { createCoach, updateCoachProfile } from '../../service/coaches.service.js';
import { insertCoach, updateCoach } from '../../repository/coaches.repository.js';
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

  it('lança ValidationException quando name está ausente', async () => {
    const { name: _, ...sem } = validCognitoAttributes;
    await expect(createCoach(sem)).rejects.toThrow(ValidationException);
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

describe('updateCoachProfile', () => {
  beforeEach(() => vi.clearAllMocks());

  it('atualiza perfil e work_location', async () => {
    await updateCoachProfile('coach-123', validUpdatePayload);

    expect(updateCoach).toHaveBeenCalledWith('coach-123', validUpdatePayload);
  });

  it('lança ValidationException com CREF inválido', async () => {
    const payload = { ...validUpdatePayload, profile: { ...validUpdatePayload.profile, cref: 'invalido' } };
    await expect(updateCoachProfile('coach-123', payload)).rejects.toThrow(ValidationException);
  });

  it('lança ValidationException com work_location vazio', async () => {
    await expect(updateCoachProfile('coach-123', { ...validUpdatePayload, work_location: [] }))
      .rejects.toThrow(ValidationException);
  });

  it('não chama updateCoach quando validação falha', async () => {
    await expect(updateCoachProfile('x', { profile: {}, work_location: [] })).rejects.toThrow();
    expect(updateCoach).not.toHaveBeenCalled();
  });

  it('propaga erro do repositório', async () => {
    updateCoach.mockRejectedValue(new Error('Falha na atualização'));
    await expect(updateCoachProfile('coach-123', validUpdatePayload)).rejects.toThrow('Falha na atualização');
  });
});
