import { describe, it, expect } from 'vitest';
import { createCoachSchema, updateCoachSchema } from '../../validation/coaches.schema.js';

describe('createCoachSchema', () => {
  const valid = { sub: '123e4567-e89b-12d3-a456-426614174000', email: 'coach@mail.com', name: 'João' };

  it('aceita atributos válidos', () => {
    expect(createCoachSchema.validate(valid).error).toBeUndefined();
  });

  it('rejeita sub inválido (não é UUID)', () => {
    expect(createCoachSchema.validate({ ...valid, sub: 'nao-uuid' }).error).toBeDefined();
  });

  it('rejeita email inválido', () => {
    expect(createCoachSchema.validate({ ...valid, email: 'semdominio' }).error).toBeDefined();
  });

  it('rejeita quando name está ausente', () => {
    const { name: _, ...sem } = valid;
    expect(createCoachSchema.validate(sem).error).toBeDefined();
  });

  it('rejeita string vazia em name', () => {
    expect(createCoachSchema.validate({ ...valid, name: '' }).error).toBeDefined();
  });
});

describe('updateCoachSchema', () => {
  const gymLocation = { type: 'GYM', gymId: 'gym-123' };
  const homeLocation = {
    type: 'HOME_SERVICE',
    coverage: { city: 'São Paulo', state: 'SP', neighborhoods: ['Centro'] },
  };

  const validProfile = {
    name: 'João',
    phone: '11999999999',
    specialties: ['Musculação'],
    cref: 'CREF 123456-G/SP',
    instagram: '@joaocoach',
    profile_video: false,
  };

  it('aceita perfil com localização em academia', () => {
    const payload = { profile: validProfile, work_location: [gymLocation] };
    expect(updateCoachSchema.validate(payload).error).toBeUndefined();
  });

  it('aceita perfil com atendimento domiciliar', () => {
    const payload = { profile: validProfile, work_location: [homeLocation] };
    expect(updateCoachSchema.validate(payload).error).toBeUndefined();
  });

  it('aceita múltiplas localizações', () => {
    const payload = { profile: validProfile, work_location: [gymLocation, homeLocation] };
    expect(updateCoachSchema.validate(payload).error).toBeUndefined();
  });

  it('rejeita CREF com formato inválido', () => {
    const payload = { profile: { ...validProfile, cref: 'cref123' }, work_location: [gymLocation] };
    expect(updateCoachSchema.validate(payload).error).toBeDefined();
  });

  it('rejeita instagram sem @', () => {
    const payload = { profile: { ...validProfile, instagram: 'joaocoach' }, work_location: [gymLocation] };
    expect(updateCoachSchema.validate(payload).error).toBeDefined();
  });

  it('rejeita work_location vazio', () => {
    const payload = { profile: validProfile, work_location: [] };
    expect(updateCoachSchema.validate(payload).error).toBeDefined();
  });

  it('rejeita specialties vazio', () => {
    const payload = { profile: { ...validProfile, specialties: [] }, work_location: [gymLocation] };
    expect(updateCoachSchema.validate(payload).error).toBeDefined();
  });

  it('rejeita HOME_SERVICE sem neighborhoods', () => {
    const badHome = { type: 'HOME_SERVICE', coverage: { city: 'SP', state: 'SP', neighborhoods: [] } };
    const payload = { profile: validProfile, work_location: [badHome] };
    expect(updateCoachSchema.validate(payload).error).toBeDefined();
  });

  it('rejeita estado com mais de 2 caracteres', () => {
    const badHome = { type: 'HOME_SERVICE', coverage: { city: 'SP', state: 'SPA', neighborhoods: ['X'] } };
    const payload = { profile: validProfile, work_location: [badHome] };
    expect(updateCoachSchema.validate(payload).error).toBeDefined();
  });
});
