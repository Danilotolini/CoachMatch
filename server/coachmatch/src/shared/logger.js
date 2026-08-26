import { randomUUID } from 'crypto';

const log = (level, data) => {
  process.stdout.write(JSON.stringify({ level, timestamp: new Date().toISOString(), ...data }) + '\n');
};

export const logger = {
  info:  (msg, extra = {}) => log('INFO',  { message: msg, ...extra }),
  warn:  (msg, extra = {}) => log('WARN',  { message: msg, ...extra }),
  error: (msg, extra = {}) => log('ERROR', { message: msg, ...extra }),
};

const _loggedHandler = (fn, { rethrow = false } = {}) => async (event, context) => {
  const traceId = event?.headers?.['x-trace-id'] ?? randomUUID();
  const userId = event?.requestContext?.authorizer?.jwt?.claims?.sub ?? null;
  const path = event?.requestContext?.http?.path ?? event?.resource ?? event?.triggerSource ?? 'unknown';
  const method = event?.requestContext?.http?.method ?? event?.httpMethod ?? (event?.triggerSource ? 'COGNITO' : 'unknown');
  const start = Date.now();

  logger.info('request_start', { trace_id: traceId, userId, path, method });

  let response;
  try {
    response = await fn(event, context);
  } catch (err) {
    const duration = Date.now() - start;
    logger.error('request_error', {
      trace_id: traceId,
      userId,
      path,
      method,
      duration_ms: duration,
      error: err?.message ?? String(err),
    });
    if (rethrow) throw err;
    return { statusCode: 500, body: JSON.stringify({ message: 'Erro interno.' }) };
  }

  const duration = Date.now() - start;

  if (rethrow) {
    logger.info('request_end', { trace_id: traceId, userId, path, method, duration_ms: duration });
    return response;
  }

  const statusCode = response?.statusCode ?? 200;
  const level = statusCode >= 500 ? 'error' : statusCode >= 400 ? 'warn' : 'info';

  log(level.toUpperCase(), {
    message: 'request_end',
    trace_id: traceId,
    userId,
    path,
    method,
    statusCode,
    duration_ms: duration,
  });

  return response;
};

export const withLogger = (fn) => _loggedHandler(fn, { rethrow: false });
export const withCognitoLogger = (fn) => _loggedHandler(fn, { rethrow: true });
