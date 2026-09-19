import { describe, it, expect } from 'vitest';
import { formatScheduleDateTime } from '../shared/format.js';

describe('schedule/shared/format', () => {
  it('formata data e hora a partir de um ISO com offset', () => {
    const { date, time } = formatScheduleDateTime('2026-05-25T07:05:00-03:00');
    expect(date).toBe('25/05/2026');
    expect(time).toBe('07:05');
  });

  it('formata data e hora a partir de um ISO em UTC (Z)', () => {
    const { date, time } = formatScheduleDateTime('2026-01-03T23:59:00Z');
    expect(date).toBe('03/01/2026');
    expect(time).toBe('23:59');
  });

  it('lança RangeError para string inválida', () => {
    expect(() => formatScheduleDateTime('not-a-date')).toThrow(RangeError);
  });
});
