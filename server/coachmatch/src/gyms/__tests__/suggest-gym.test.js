import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../suggest-gym/repository.js', () => ({
  insertGym: vi.fn(),
}));

import { handler } from '../suggest-gym/handler.js';
import { suggestGym } from '../suggest-gym/index.js';
import { gymSchema } from '../suggest-gym/schema.js';
import { insertGym } from '../suggest-gym/repository.js';
import { ValidationException } from '../../shared/exceptions.js';

// ─── Helpers ─────────────────────────────────────────────────────────────────
const validGym = {
  name:         'Academia XYZ',
  address:      'Rua A, 123',
  city:         'São Paulo',
  state:        'SP',
  neighborhood: 'Centro',
  coordinates:  null,
};

const buildEvent = (body = validGym) => ({
  body: JSON.stringify(body),
});

// ─── Schema ──────────────────────────────────────────────────────────────────
describe('suggest-gym › schema', () => {
  it('aceita academia válida', () => {
    const { error } = gymSchema.validate(validGym);
    expect(error).toBeUndefined();
  });

  it('rejeita quando name está ausente', () => {
    const { name: _, ...sem } = validGym;
    expect(gymSchema.validate(sem).error).toBeDefined();
  });

  it('rejeita estado com mais de 2 chars', () => {
    const { error } = gymSchema.validate({ ...validGym, state: 'SAO' });
    expect(error?.details[0].path).toContain('state');
  });

  it('converte estado para uppercase automaticamente', () => {
    const { value } = gymSchema.validate({ ...validGym, state: 'sp' });
    expect(value.state).toBe('SP');
  });

  it('preenche coordinates como null quando ausente', () => {
    const { coordinates: _, ...semCoordinates } = validGym;
    const { value, error } = gymSchema.validate(semCoordinates);
    expect(error).toBeUndefined();
    expect(value.coordinates).toBeNull();
  });

  it('rejeita coordinates com latitude e longitude', () => {
    expect(gymSchema.validate({ ...validGym, coordinates: { lat: -23, lng: -46 } }).error).toBeDefined();
  });
});

// ─── Business Logic (index) ───────────────────────────────────────────────────
describe('suggest-gym › index (suggestGym)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    insertGym.mockResolvedValue(undefined);
  });

  it('chama insertGym com os dados validados', async () => {
    await suggestGym(validGym);
    expect(insertGym).toHaveBeenCalledOnce();
    expect(insertGym).toHaveBeenCalledWith(expect.objectContaining({
      name: validGym.name,
      city: validGym.city,
      coordinates: null,
    }));
  });

  it('lança ValidationException quando dados são inválidos', async () => {
    await expect(suggestGym({ name: '' })).rejects.toBeInstanceOf(ValidationException);
    expect(insertGym).not.toHaveBeenCalled();
  });

  it('propaga erro do repositório', async () => {
    insertGym.mockRejectedValue(new Error('DynamoDB timeout'));
    await expect(suggestGym(validGym)).rejects.toThrow('DynamoDB timeout');
  });
});

// ─── Handler ─────────────────────────────────────────────────────────────────
describe('suggest-gym › handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    insertGym.mockResolvedValue(undefined);
  });

  it('retorna 201 após sugestão bem-sucedida', async () => {
    const response = await handler(buildEvent());
    expect(response.statusCode).toBe(201);
    const body = JSON.parse(response.body);
    expect(body.message).toMatch(/sucesso/i);
  });

  it('aceita body já como objeto (não string)', async () => {
    const response = await handler({ body: validGym });
    expect(response.statusCode).toBe(201);
  });

  it('retorna 500 quando body está ausente', async () => {
    const result = await handler({});
    expect(result.statusCode).toBe(500);
  });

  it('retorna 422 quando dados da academia são inválidos', async () => {
    const response = await handler(buildEvent({ name: '' }));
    expect(response.statusCode).toBe(422);
    const body = JSON.parse(response.body);
    expect(body.details).toBeDefined();
  });

  it('retorna 500 em erros inesperados', async () => {
    insertGym.mockRejectedValue(new Error('Falha no DB'));
    const result = await handler(buildEvent());
    expect(result.statusCode).toBe(500);
  });
});
