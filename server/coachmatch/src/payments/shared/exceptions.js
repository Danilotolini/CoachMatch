export class PaymentNotFoundException extends Error {
  constructor(transactionId) {
    super(`Transação ${transactionId} não encontrada.`);
    this.name       = 'PaymentNotFoundException';
    this.statusCode = 404;
  }
}

export class PaymentAlreadyRefundedException extends Error {
  constructor(transactionId) {
    super(`Transação ${transactionId} já foi estornada.`);
    this.name       = 'PaymentAlreadyRefundedException';
    this.statusCode = 409;
  }
}

export class PaymentNotRefundableException extends Error {
  constructor(status) {
    super(`Só é possível estornar transações aprovadas. Status atual: ${status}`);
    this.name       = 'PaymentNotRefundableException';
    this.statusCode = 400;
  }
}

export class InvalidRefundAmountException extends Error {
  constructor(refundAmount, transactionAmount) {
    super(`Valor do estorno (${refundAmount}) não pode ser maior que o valor original (${transactionAmount}).`);
    this.name       = 'InvalidRefundAmountException';
    this.statusCode = 422;
  }
}
