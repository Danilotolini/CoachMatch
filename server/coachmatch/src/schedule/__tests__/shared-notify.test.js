import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const { sendMock } = vi.hoisted(() => ({ sendMock: vi.fn() }));

vi.mock('@aws-sdk/client-sqs', () => ({
  SQSClient: vi.fn(() => ({ send: sendMock })),
  SendMessageCommand: vi.fn((input) => input),
}));

import { notifyByEmail } from '../shared/notify.js';

describe('schedule/shared/notify', () => {
  const originalQueueUrl = process.env.MAIL_SENDER_QUEUE_URL;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.MAIL_SENDER_QUEUE_URL = 'https://sqs.sa-east-1.amazonaws.com/138413505977/MailSender';
  });

  afterEach(() => {
    process.env.MAIL_SENDER_QUEUE_URL = originalQueueUrl;
  });

  it('envia mensagem para a fila com email/subject/body', async () => {
    sendMock.mockResolvedValue({});
    await notifyByEmail({ email: 'aluno@teste.com', subject: 'Assunto', body: 'Corpo' });

    expect(sendMock).toHaveBeenCalledTimes(1);
    expect(sendMock).toHaveBeenCalledWith(
      expect.objectContaining({
        QueueUrl: 'https://sqs.sa-east-1.amazonaws.com/138413505977/MailSender',
        MessageBody: JSON.stringify({ email: 'aluno@teste.com', subject: 'Assunto', body: 'Corpo' }),
      })
    );
  });

  it('não lança quando o SQS falha', async () => {
    sendMock.mockRejectedValue(new Error('ThrottlingException'));
    await expect(
      notifyByEmail({ email: 'aluno@teste.com', subject: 'Assunto', body: 'Corpo' })
    ).resolves.toBeUndefined();
  });

  it('é no-op quando MAIL_SENDER_QUEUE_URL está vazia', async () => {
    process.env.MAIL_SENDER_QUEUE_URL = '';
    await notifyByEmail({ email: 'aluno@teste.com', subject: 'Assunto', body: 'Corpo' });
    expect(sendMock).not.toHaveBeenCalled();
  });

  it('é no-op quando não há email', async () => {
    await notifyByEmail({ email: null, subject: 'Assunto', body: 'Corpo' });
    expect(sendMock).not.toHaveBeenCalled();
  });
});
