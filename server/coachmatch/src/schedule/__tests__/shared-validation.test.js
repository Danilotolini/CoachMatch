import { describe, it, expect } from 'vitest';
import { validateDateTimeRange, missingFieldErrors, requiredStringField, SCHEDULE_ID_BODY, assertValid } from '../shared/validation.js';
import { BadRequestException } from '../shared/exceptions.js';

describe('schedule/shared/validation › validateDateTimeRange', () => {
  it('retorna vazio para range válido', () => {
    expect(validateDateTimeRange('2026-05-25T07:00:00-03:00', '2026-05-25T08:00:00-03:00')).toEqual([]);
  });

  it('reporta startDateTime inválido', () => {
    const errors = validateDateTimeRange('not-a-date', '2026-05-25T08:00:00-03:00');
    expect(errors).toContain("'startDateTime' inválido: recebido 'not-a-date', esperado ISO 8601 (ex.: 2026-05-25T07:00:00-03:00)");
  });

  it('reporta endDateTime inválido', () => {
    const errors = validateDateTimeRange('2026-05-25T07:00:00-03:00', 'not-a-date');
    expect(errors).toContain("'endDateTime' inválido: recebido 'not-a-date', esperado ISO 8601 (ex.: 2026-05-25T08:00:00-03:00)");
  });

  it('reporta start >= end quando ambos válidos', () => {
    const errors = validateDateTimeRange('2026-05-25T08:00:00-03:00', '2026-05-25T07:00:00-03:00');
    expect(errors).toEqual(["'startDateTime' deve ser anterior a 'endDateTime'."]);
  });

  it('não checa ordem quando algum formato é inválido', () => {
    const errors = validateDateTimeRange('not-a-date', 'not-a-date');
    expect(errors).toHaveLength(2);
  });

  // Paridade com o `datetime.fromisoformat` das lambdas Python originais.
  it.each([
    ['sem segundos', '2026-05-25T07:00', '2026-05-25T08:00'],
    ['só data', '2026-05-25', '2026-05-26'],
    ['com espaço no lugar do T', '2026-05-25 07:00:00', '2026-05-25 08:00:00'],
    ['com milissegundos e Z', '2026-05-25T07:00:00.000Z', '2026-05-25T08:00:00.000Z'],
  ])('aceita ISO 8601 %s', (_label, start, end) => {
    expect(validateDateTimeRange(start, end)).toEqual([]);
  });

  it.each(['2026-05-25T07', '2026-13-01T07:00:00', '25/05/2026', ''])(
    'rejeita %s',
    (value) => {
      expect(validateDateTimeRange(value, '2026-05-26T08:00:00-03:00')).toContain(
        `'startDateTime' inválido: recebido '${value}', esperado ISO 8601 (ex.: 2026-05-25T07:00:00-03:00)`,
      );
    },
  );
});

describe('schedule/shared/validation › missingFieldErrors', () => {
  it('detecta chaves ausentes (não truthiness)', () => {
    expect(missingFieldErrors({ a: '' }, ['a', 'b'])).toEqual(["Campo obrigatório ausente: 'b'."]);
  });

  it('retorna vazio quando todas as chaves existem', () => {
    expect(missingFieldErrors({ a: 1, b: 2 }, ['a', 'b'])).toEqual([]);
  });

  it('lida com source undefined', () => {
    expect(missingFieldErrors(undefined, ['a'])).toEqual(["Campo obrigatório ausente: 'a'."]);
  });
});

const scheduleIdErrors = (source) => {
  try {
    assertValid(SCHEDULE_ID_BODY, source);
    return [];
  } catch (err) {
    expect(err).toBeInstanceOf(BadRequestException);
    return err.errors;
  }
};

describe('schedule/shared/validation › SCHEDULE_ID_BODY / requiredStringField', () => {
  it('rejeita campo ausente', () => {
    expect(scheduleIdErrors({})).toEqual(["Campo obrigatório ausente: 'scheduleId'."]);
  });

  it('rejeita string vazia como se fosse ausente', () => {
    expect(scheduleIdErrors({ scheduleId: '' })).toEqual(["Campo obrigatório ausente: 'scheduleId'."]);
  });

  it('aceita quando o campo está presente e não-vazio', () => {
    expect(scheduleIdErrors({ scheduleId: 'avl_1' })).toEqual([]);
  });

  it('ignora campos desconhecidos', () => {
    expect(scheduleIdErrors({ scheduleId: 'avl_1', extra: 'x' })).toEqual([]);
  });

  it('permite sobrescrever a mensagem de um código de erro Joi específico', () => {
    const schema = requiredStringField('status', { 'any.only': 'valor inválido' }).valid('A', 'B');
    expect(schema.validate('C').error.message).toBe('valor inválido');
    expect(schema.validate('A').error).toBeUndefined();
  });
});
