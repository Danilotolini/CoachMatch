export class DatabaseConnectionException extends Error {
  constructor(message, options) {
    super(message, options);
    this.name = 'DatabaseConnectionException';
  }
}

export class ValidationException extends Error {
  constructor(message, details) {
    super(message);
    this.name = 'ValidationException';
    this.details = details;
  }
}

export class NotFoundException extends Error {
  constructor(entity, id) {
    super(`${entity} não encontrado: ${id}`);
    this.name = 'NotFoundException';
  }
}
