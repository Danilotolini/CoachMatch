import { afterEach, describe, expect, it, vi } from 'vitest';
import { tableName } from '../tables.js';

describe('tableName', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('devolve o nome configurado no ambiente', () => {
    vi.stubEnv('PAYMENTS_TABLE', 'payments-dev');

    expect(tableName('payments')).toBe('payments-dev');
  });

  it('falha quando a variável da tabela não está definida', () => {
    vi.stubEnv('PAYMENTS_TABLE', '');

    expect(() => tableName('payments')).toThrow(
      "PAYMENTS_TABLE não definida: recebido '', esperado o nome da tabela 'payments' do stage",
    );
  });

  it('falha quando a tabela não é conhecida', () => {
    expect(() => tableName('payment')).toThrow("Tabela desconhecida: recebido 'payment'");
  });
});
