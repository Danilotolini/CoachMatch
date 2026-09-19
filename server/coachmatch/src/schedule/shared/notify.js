import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs';

const sqs = new SQSClient({});

/**
 * Envia notificação por e-mail via fila externa MailSender.
 *
 * Nunca lança — o schedule já foi persistido quando isso é chamado, então uma
 * falha de SQS não pode derrubar a resposta; é apenas logada.
 *
 * No-op quando MAIL_SENDER_QUEUE_URL não está configurada (stage local) ou
 * quando não há e-mail de destino.
 *
 * @param {{ email: string|null|undefined, subject: string, body: string }} params
 */
export const notifyByEmail = async ({ email, subject, body }) => {
  const queueUrl = process.env.MAIL_SENDER_QUEUE_URL;
  if (!queueUrl || !email) return;

  try {
    await sqs.send(new SendMessageCommand({
      QueueUrl: queueUrl,
      MessageBody: JSON.stringify({ email, subject, body }),
    }));
  } catch (err) {
    console.warn(`[WARN] Falha ao enviar notificação por e-mail para ${email}:`, err?.message ?? err);
  }
};
