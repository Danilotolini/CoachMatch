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
});

describe('updateCoachSchema', () => {
  const gymLocation = { type: 'GYM', gymId: 'gym-123' };
  const homeLocation = { type: 'HOME_SERVICE', serviceRadius: 20 };

  const validProfile = {
    name: 'João',
    phone: '11999999999',
    specialties: ['Musculação'],
    cref: 'CREF 123456-G/SP',
    instagram: '@joaocoach',
    profile_video: false,
  };

  it('aceita perfil com localização em academia', () => {
    expect(updateCoachSchema.validate({ profile: validProfile, work_location: [gymLocation] }).error)
      .toBeUndefined();
  });

  it('aceita perfil com HOME_SERVICE e serviceRadius', () => {
    expect(updateCoachSchema.validate({ profile: validProfile, work_location: [homeLocation] }).error)
      .toBeUndefined();
  });

  it('aceita múltiplas localizações', () => {
    expect(updateCoachSchema.validate({ profile: validProfile, work_location: [gymLocation, homeLocation] }).error)
      .toBeUndefined();
  });

  it('define profile_video como false por padrão quando omitido', () => {
    const { profile_video: _, ...profileSemVideo } = validProfile;
    const { value } = updateCoachSchema.validate({ profile: profileSemVideo, work_location: [gymLocation] });
    expect(value.profile.profile_video).toBe(false);
  });

  it('rejeita CREF sem o prefixo CREF', () => {
    const bad = { ...validProfile, cref: '123456-G/SP' };
    expect(updateCoachSchema.validate({ profile: bad, work_location: [gymLocation] }).error).toBeDefined();
  });

  it('rejeita HOME_SERVICE sem serviceRadius', () => {
    const badHome = { type: 'HOME_SERVICE' };
    expect(updateCoachSchema.validate({ profile: validProfile, work_location: [badHome] }).error).toBeDefined();
  });

  it('rejeita HOME_SERVICE com serviceRadius abaixo de 10', () => {
    const badHome = { type: 'HOME_SERVICE', serviceRadius: 5 };
    expect(updateCoachSchema.validate({ profile: validProfile, work_location: [badHome] }).error).toBeDefined();
  });

  it('rejeita HOME_SERVICE com serviceRadius acima de 50', () => {
    const badHome = { type: 'HOME_SERVICE', serviceRadius: 55 };
    expect(updateCoachSchema.validate({ profile: validProfile, work_location: [badHome] }).error).toBeDefined();
  });

  it('rejeita work_location vazio', () => {
    expect(updateCoachSchema.validate({ profile: validProfile, work_location: [] }).error).toBeDefined();
  });

  it('rejeita specialties vazio', () => {
    const bad = { ...validProfile, specialties: [] };
    expect(updateCoachSchema.validate({ profile: bad, work_location: [gymLocation] }).error).toBeDefined();
  });
});
