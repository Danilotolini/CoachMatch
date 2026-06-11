import { describe, it, expect } from 'vitest';
import { DatabaseConnectionException, ValidationException, NotFoundException } from '../exceptions.js';

describe('DatabaseConnectionException', () => {
  it('tem name correto e herda de Error', () => {
    const err = new DatabaseConnectionException('falhou');
    expect(err).toBeInstanceOf(Error);
    expect(err.name).toBe('DatabaseConnectionException');
    expect(err.message).toBe('falhou');
  });
});

describe('ValidationException', () => {
  it('armazena os detalhes de validação', () => {
    const details = [{ message: 'campo inválido' }];
    const err = new ValidationException('Inválido', details);
    expect(err).toBeInstanceOf(Error);
    expect(err.name).toBe('ValidationException');
    expect(err.details).toBe(details);
  });
});

describe('NotFoundException', () => {
  it('formata a mensagem com entidade e id', () => {
    const err = new NotFoundException('Coach', 'uuid-123');
    expect(err).toBeInstanceOf(Error);
    expect(err.name).toBe('NotFoundException');
    expect(err.message).toContain('Coach');
    expect(err.message).toContain('uuid-123');
  });
});
