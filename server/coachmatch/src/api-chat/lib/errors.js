/** Erros de domínio do chat, mapeados para status HTTP no wrapper de handler. */

export class ChatValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = "ChatValidationError";
  }
}

export class ForbiddenError extends Error {
  constructor(message = "Acesso negado a esta conversa") {
    super(message);
    this.name = "ForbiddenError";
  }
}

export class NotFoundError extends Error {
  constructor(message = "Recurso não encontrado") {
    super(message);
    this.name = "NotFoundError";
  }
}
