import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Mocks ───────────────────────────────────────────────────────────────────
vi.mock('../create-student/repository.js', () => ({
  insertStudent: vi.fn(),
}));

import { handler } from '../create-student/handler.js';
import { createStudent } from '../create-student/index.js';
import { cognitoAttributesSchema } from '../create-student/schema.js';
import { insertStudent } from '../create-student/repository.js';
import { ValidationException } from '../../shared/exceptions.js';

// ─── Helpers ─────────────────────────────────────────────────────────────────
const validAttributes = {
  sub: '550e8400-e29b-41d4-a716-446655440000',
  email: 'joao@email.com',
  name: 'João Silva',
};

const buildCognitoEvent = (attrs = validAttributes) => ({
  request: { userAttributes: attrs },
  triggerSource: 'PostConfirmation_ConfirmSignUp',
  userName: attrs.sub,
});

// ─── Schema ──────────────────────────────────────────────────────────────────
describe('create-student › schema', () => {
  it('aceita atributos válidos', () => {
    const { error } = cognitoAttributesSchema.validate(validAttributes);
    expect(error).toBeUndefined();
  });

  it('rejeita sub que não é UUID', () => {
    const { error } = cognitoAttributesSchema.validate({ ...validAttributes, sub: 'not-a-uuid' });
    expect(error).toBeDefined();
    expect(error.details[0].path).toContain('sub');
  });

  it('rejeita email sem @', () => {
    const { error } = cognitoAttributesSchema.validate({ ...validAttributes, email: 'semArroba' });
    expect(error).toBeDefined();
    expect(error.details[0].path).toContain('email');
  });

  it('rejeita email com espaço antes de @', () => {
    const { error } = cognitoAttributesSchema.validate({ ...validAttributes, email: 'es paço@mail.com' });
    expect(error).toBeDefined();
  });

  it('rejeita quando nome está ausente', () => {
    const { error } = cognitoAttributesSchema.validate({ sub: validAttributes.sub, email: validAttributes.email });
    expect(error).toBeDefined();
    expect(error.details[0].path).toContain('name');
  });
});

// ─── Business Logic (index) ───────────────────────────────────────────────────
describe('create-student › index (createStudent)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    insertStudent.mockResolvedValue(undefined);
  });

  it('chama insertStudent com a estrutura correta', async () => {
    await createStudent(validAttributes);

    expect(insertStudent).toHaveBeenCalledOnce();
    expect(insertStudent).toHaveBeenCalledWith({
      studentId: validAttributes.sub,
      email: validAttributes.email,
      status: 'PENDING_PROFILE',
      profile: { name: validAttributes.name },
    });
  });

  it('lança ValidationException quando atributos são inválidos', async () => {
    await expect(createStudent({ sub: 'nao-eh-uuid', email: 'valido@email.com', name: 'Ok' }))
      .rejects
      .toBeInstanceOf(ValidationException);
  });

  it('propaga erro do repositório', async () => {
    insertStudent.mockRejectedValue(new Error('DynamoDB indisponível'));
    await expect(createStudent(validAttributes)).rejects.toThrow('DynamoDB indisponível');
  });
});

// ─── Handler ─────────────────────────────────────────────────────────────────
describe('create-student › handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    insertStudent.mockResolvedValue(undefined);
  });

  it('retorna o evento original após criação bem-sucedida', async () => {
    const event = buildCognitoEvent();
    const result = await handler(event);
    expect(result).toBe(event);
  });

  it('chama createStudent com os userAttributes do evento', async () => {
    const event = buildCognitoEvent();
    await handler(event);
    expect(insertStudent).toHaveBeenCalledOnce();
  });

  it('lança erro quando userAttributes está ausente', async () => {
    const event = { triggerSource: 'PostConfirmation_ConfirmSignUp' };
    await expect(handler(event)).rejects.toThrow('userAttributes ausente');
  });

  it('lança erro quando event é null', async () => {
    await expect(handler(null)).rejects.toThrow();
  });

  it('propaga ValidationException (atributos inválidos do Cognito)', async () => {
    const badEvent = buildCognitoEvent({ sub: 'ruim', email: 'ruim', name: '' });
    await expect(handler(badEvent)).rejects.toBeInstanceOf(ValidationException);
  });
});
