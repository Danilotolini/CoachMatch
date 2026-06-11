import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../create-coach/repository.js', () => ({
  insertCoach: vi.fn(),
}));

import { handler } from '../create-coach/handler.js';
import { createCoach } from '../create-coach/index.js';
import { cognitoAttributesSchema } from '../create-coach/schema.js';
import { insertCoach } from '../create-coach/repository.js';
import { ValidationException } from '../../shared/exceptions.js';

// ─── Helpers ─────────────────────────────────────────────────────────────────
const validAttributes = {
  sub: '123e4567-e89b-12d3-a456-426614174000',
  email: 'coach@mail.com',
  name: 'João Silva',
};

const buildCognitoEvent = (attrs = validAttributes) => ({
  request: { userAttributes: attrs },
  triggerSource: 'PostConfirmation_ConfirmSignUp',
});

// ─── Schema ──────────────────────────────────────────────────────────────────
describe('create-coach › schema', () => {
  it('aceita atributos válidos do Cognito', () => {
    const { error } = cognitoAttributesSchema.validate(validAttributes);
    expect(error).toBeUndefined();
  });

  it('rejeita sub que não é UUID', () => {
    const { error } = cognitoAttributesSchema.validate({ ...validAttributes, sub: 'nao-uuid' });
    expect(error?.details[0].path).toContain('sub');
  });

  it('rejeita email inválido', () => {
    const { error } = cognitoAttributesSchema.validate({ ...validAttributes, email: 'semdominio' });
    expect(error?.details[0].path).toContain('email');
  });

  it('rejeita quando name está ausente', () => {
    const { error } = cognitoAttributesSchema.validate({ sub: validAttributes.sub, email: validAttributes.email });
    expect(error?.details[0].path).toContain('name');
  });
});

// ─── Business Logic (index) ───────────────────────────────────────────────────
describe('create-coach › index (createCoach)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    insertCoach.mockResolvedValue(undefined);
  });

  it('insere coach com status PENDING_PROFILE', async () => {
    await createCoach(validAttributes);
    expect(insertCoach).toHaveBeenCalledWith({
      coachId: validAttributes.sub,
      email:   validAttributes.email,
      status:  'PENDING_PROFILE',
      profile: { name: validAttributes.name },
    });
  });

  it('lança ValidationException quando sub não é UUID', async () => {
    await expect(createCoach({ ...validAttributes, sub: 'invalido' }))
      .rejects.toBeInstanceOf(ValidationException);
  });

  it('não chama insertCoach quando validação falha', async () => {
    await expect(createCoach({ sub: 'x', email: 'x', name: '' })).rejects.toThrow();
    expect(insertCoach).not.toHaveBeenCalled();
  });

  it('propaga erro do repositório', async () => {
    insertCoach.mockRejectedValue(new Error('DynamoDB indisponível'));
    await expect(createCoach(validAttributes)).rejects.toThrow('DynamoDB indisponível');
  });
});

// ─── Handler ─────────────────────────────────────────────────────────────────
describe('create-coach › handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    insertCoach.mockResolvedValue(undefined);
  });

  it('retorna o evento original após criação bem-sucedida', async () => {
    const event = buildCognitoEvent();
    const result = await handler(event);
    expect(result).toBe(event);
  });

  it('lança erro quando userAttributes está ausente', async () => {
    await expect(handler({ request: {} })).rejects.toThrow('userAttributes ausente');
  });

  it('lança erro quando event.request está ausente', async () => {
    await expect(handler({})).rejects.toThrow();
  });

  it('lança erro quando event é null', async () => {
    await expect(handler(null)).rejects.toThrow();
  });

  it('propaga ValidationException quando atributos são inválidos', async () => {
    const badEvent = buildCognitoEvent({ sub: 'ruim', email: 'ruim', name: '' });
    await expect(handler(badEvent)).rejects.toBeInstanceOf(ValidationException);
  });
});
