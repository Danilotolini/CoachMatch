/**
 * Exceção lançada quando há falha de conexão ou operação com o banco de dados.
 */
export class DatabaseConnectionException extends Error {
  constructor(message = 'Falha na conexão com o banco de dados', options) {
    super(message, options);
    this.name = 'DatabaseConnectionException';
  }
}

/**
 * Exceção lançada quando os dados enviados pelo cliente falham na validação do schema Joi.
 * @param {string} message - Mensagem descritiva do erro.
 * @param {Array}  details - Array de detalhes do Joi (error.details).
 */
export class ValidationException extends Error {
  constructor(message, details = []) {
    super(message);
    this.name = 'ValidationException';
    this.details = details;
  }
}

/**
 * Exceção lançada quando um recurso não é encontrado no banco de dados.
 * @param {string} resource - Nome do recurso (ex: 'Estudante', 'Coach').
 * @param {string} id       - ID procurado.
 */
export class NotFoundException extends Error {
  constructor(resource, id) {
    super(`${resource} com ID "${id}" não encontrado`);
    this.name = 'NotFoundException';
    this.resource = resource;
    this.id = id;
  }
}

/**
 * Exceção lançada quando uma operação é inválida para o estado atual do recurso.
 * Mapeada para HTTP 409 Conflict.
 * @param {string} message - Descrição do conflito.
 */
export class ConflictException extends Error {
  constructor(message = 'Operação inválida para o estado atual do recurso') {
    super(message);
    this.name = 'ConflictException';
  }
}

/**
 * Exceção lançada quando o autenticado não tem permissão sobre o recurso.
 * Mapeada para HTTP 403 Forbidden.
 * @param {string} message - Descrição da restrição.
 */
export class ForbiddenException extends Error {
  constructor(message = 'Acesso negado a este recurso') {
    super(message);
    this.name = 'ForbiddenException';
  }
}
