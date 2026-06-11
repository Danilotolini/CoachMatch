/**
 * Exceção lançada quando há falha de conexão ou operação com o banco de dados.
 */
export class DatabaseConnectionException extends Error {
  constructor(message = 'Falha na conexão com o banco de dados') {
    super(message);
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
