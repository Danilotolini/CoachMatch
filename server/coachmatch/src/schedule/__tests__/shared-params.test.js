import { describe, it, expect } from 'vitest';
import { readParams } from '../shared/params.js';
import { BadRequestException } from '../shared/exceptions.js';

describe('schedule/shared/params › readParams', () => {
  it('prefere a query string quando presente', () => {
    const event = {
      queryStringParameters: { startDateTime: '2026-05-25T07:00:00-03:00' },
      body: JSON.stringify({ startDateTime: 'do-body' }),
    };
    expect(readParams(event)).toEqual({ startDateTime: '2026-05-25T07:00:00-03:00' });
  });

  it.each([
    ['null', null],
    ['ausente', undefined],
    ['objeto vazio', {}],
  ])('cai para o body JSON quando a query string é %s', (_label, qs) => {
    const event = { queryStringParameters: qs, body: JSON.stringify({ scheduleId: 'avl_1' }) };
    expect(readParams(event)).toEqual({ scheduleId: 'avl_1' });
  });

  it('devolve objeto vazio sem query string e sem body', () => {
    expect(readParams({})).toEqual({});
  });

  it('lança 400 quando o body não é JSON válido', () => {
    expect(() => readParams({ body: '{nao-e-json' })).toThrow(BadRequestException);
  });
});
