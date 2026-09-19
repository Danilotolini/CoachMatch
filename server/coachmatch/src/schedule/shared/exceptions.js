import { HttpError } from '../../shared/http.js';

/**
 * Base para os erros HTTP do domínio de agendamento. `httpHandler` (em
 * `src/shared/http.js`) faz o catch genérico de qualquer `HttpError` e devolve
 * `{ statusCode, body }`.
 *
 * O formato `{"errors": [...]}` é contrato com o cliente, que lê `errors[0]`
 * em `client/src/lib/http.ts` — diferente do `{message, details}` do Joi usado
 * nos demais módulos do serviço.
 */
export class ScheduleHttpException extends HttpError {
  constructor(statusCode, errors) {
    const list = Array.isArray(errors) ? errors : [errors];
    super(statusCode, { errors: list });
    this.name = 'ScheduleHttpException';
    this.message = list.join(' ');
    this.errors = list;
  }
}

/** 400 — campo obrigatório ausente ou formato inválido. */
export class BadRequestException extends ScheduleHttpException {
  constructor(errors) {
    super(400, errors);
    this.name = 'BadRequestException';
  }
}

/** 401 — JWT ausente ou sem claim `sub`. */
export class UnauthorizedException extends ScheduleHttpException {
  constructor(errors) {
    super(401, errors);
    this.name = 'UnauthorizedException';
  }
}

/** 403 — autenticado não é dono do recurso (coachId/studentId não bate). */
export class ScheduleForbiddenException extends ScheduleHttpException {
  constructor(errors) {
    super(403, errors);
    this.name = 'ScheduleForbiddenException';
  }
}

/** 404 — schedule/coach/student referenciado não existe. */
export class ScheduleNotFoundException extends ScheduleHttpException {
  constructor(errors) {
    super(404, errors);
    this.name = 'ScheduleNotFoundException';
  }
}

/**
 * 409 — o recurso mudou entre a leitura e a escrita (ver `shared/concurrency.js`).
 * Nada foi gravado; o cliente pode repetir a requisição.
 */
export class ScheduleConflictException extends ScheduleHttpException {
  constructor(errors) {
    super(409, errors);
    this.name = 'ScheduleConflictException';
  }
}

/** 422 — operação inválida para o estado atual do schedule/request. */
export class ScheduleStateException extends ScheduleHttpException {
  constructor(errors) {
    super(422, errors);
    this.name = 'ScheduleStateException';
  }
}

/** 500 — falha inesperada de infraestrutura (DynamoDB, etc.). */
export class ScheduleInternalException extends ScheduleHttpException {
  constructor(errors) {
    super(500, errors);
    this.name = 'ScheduleInternalException';
  }
}
