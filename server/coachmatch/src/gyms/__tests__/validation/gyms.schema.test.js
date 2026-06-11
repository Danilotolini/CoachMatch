import { describe, it, expect } from 'vitest';
import { gymSchema } from '../../validation/gyms.schema.js';

const validGym = {
  name: 'Academia XYZ',
  address: 'Rua A, 123',
  city: 'São Paulo',
  state: 'SP',
  neighborhood: 'Centro',
  coordinates: { lat: -23.5505, lng: -46.6333 },
};

describe('gymSchema', () => {
  it('aceita academia válida', () => {
    expect(gymSchema.validate(validGym).error).toBeUndefined();
  });

  it('rejeita quando name está ausente', () => {
    const { name: _, ...sem } = validGym;
    expect(gymSchema.validate(sem).error).toBeDefined();
  });

  it('rejeita estado com mais de 2 chars', () => {
    expect(gymSchema.validate({ ...validGym, state: 'SAO' }).error).toBeDefined();
  });

  it('converte estado para uppercase automaticamente', () => {
    const { value } = gymSchema.validate({ ...validGym, state: 'sp' });
    expect(value.state).toBe('SP');
  });

  it('rejeita lat fora do range (-90 a 90)', () => {
    expect(gymSchema.validate({ ...validGym, coordinates: { lat: -91, lng: 0 } }).error).toBeDefined();
    expect(gymSchema.validate({ ...validGym, coordinates: { lat: 91, lng: 0 } }).error).toBeDefined();
  });

  it('rejeita lng fora do range (-180 a 180)', () => {
    expect(gymSchema.validate({ ...validGym, coordinates: { lat: 0, lng: -181 } }).error).toBeDefined();
    expect(gymSchema.validate({ ...validGym, coordinates: { lat: 0, lng: 181 } }).error).toBeDefined();
  });

  it('rejeita coordinates ausente', () => {
    const { coordinates: _, ...sem } = validGym;
    expect(gymSchema.validate(sem).error).toBeDefined();
  });

  it('rejeita coordinates sem lat ou lng', () => {
    expect(gymSchema.validate({ ...validGym, coordinates: { lat: -23 } }).error).toBeDefined();
    expect(gymSchema.validate({ ...validGym, coordinates: { lng: -46 } }).error).toBeDefined();
  });

  it('aceita coordenadas nos limites exatos', () => {
    expect(gymSchema.validate({ ...validGym, coordinates: { lat: -90, lng: -180 } }).error).toBeUndefined();
    expect(gymSchema.validate({ ...validGym, coordinates: { lat: 90, lng: 180 } }).error).toBeUndefined();
  });
});
