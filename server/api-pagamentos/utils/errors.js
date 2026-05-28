class PaymentNotFoundError extends Error {
  constructor(transactionId) {
    super(`Transação ${transactionId} não encontrada.`);
    this.statusCode = 404;
    this.code = 'PAYMENT_NOT_FOUND';
  }
}

class PaymentAlreadyRefundedError extends Error {
  constructor(transactionId) {
    super(`Transação ${transactionId} já foi estornada.`);
    this.statusCode = 409;
    this.code = 'PAYMENT_ALREADY_REFUNDED';
  }
}

class PaymentNotRefundableError extends Error {
  constructor(status) {
    super(`Só é possível estornar transações aprovadas. Status atual: ${status}`);
    this.statusCode = 400;
    this.code = 'PAYMENT_NOT_REFUNDABLE';
  }
}

class InvalidRefundAmountError extends Error {
  constructor(refundAmount, transactionAmount) {
    super(`Valor do estorno (${refundAmount}) não pode ser maior que o valor original (${transactionAmount}).`);
    this.statusCode = 422;
    this.code = 'INVALID_REFUND_AMOUNT';
  }
}

module.exports = {
  PaymentNotFoundError,
  PaymentAlreadyRefundedError,
  PaymentNotRefundableError,
  InvalidRefundAmountError,
};
