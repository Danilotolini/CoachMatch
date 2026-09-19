/**
 * Compara uma Lambda Python (invocada na AWS) com o port Node (executado aqui no
 * processo, contra o DynamoDB real) usando o mesmo evento.
 *
 * Rodar de dentro de `server/coachmatch/` para o node_modules resolver:
 *   node scripts/migration/compare.mjs
 *
 * Editar `CASOS` para cada função sendo migrada.
 */
import { execFileSync } from 'child_process';
import { readFileSync, writeFileSync } from 'fs';

process.env.REGION = 'sa-east-1';
// != 'local' faz o shared/config.js usar a credencial do perfil em vez das nomeadas.
process.env.STAGE = 'dev';
const AWS_PROFILE = process.env.AWS_PROFILE ?? 'CoachMatch';
process.env.AWS_PROFILE = AWS_PROFILE;
// MAIL_SENDER_QUEUE_URL deliberadamente não setada: notifyByEmail vira no-op
// (src/schedule/shared/notify.js), então comparar escrita não dispara e-mail real.

const SRC = new URL('../../src/schedule/', import.meta.url).pathname;

/** JWT sem assinatura válida: a Python só decodifica o payload, não verifica. */
const jwt = (sub) => 'x.' + Buffer.from(JSON.stringify({ sub })).toString('base64url') + '.y';

/**
 * As duas implementações leem a identidade de lugares diferentes — a Python
 * decodifica o header Authorization, o Node lê a claim do authorizer — então o
 * evento carrega as duas formas.
 */
const evt = (sub, params, body = null) => ({
  headers: sub ? { Authorization: `Bearer ${jwt(sub)}` } : {},
  requestContext: sub ? { authorizer: { jwt: { claims: { sub } } } } : {},
  queryStringParameters: params,
  body: body && JSON.stringify(body),
});

const invocaPython = (fn, event) => {
  writeFileSync('/tmp/mig-ev.json', JSON.stringify(event));
  execFileSync('aws', ['lambda', 'invoke', '--profile', AWS_PROFILE,
    '--function-name', fn, '--region', 'sa-east-1',
    '--payload', 'fileb:///tmp/mig-ev.json', '/tmp/mig-out.json'], { stdio: 'ignore' });
  return JSON.parse(readFileSync('/tmp/mig-out.json', 'utf8'));
};

const rodaNode = async (modulo, exportado, event) =>
  (await import(`${SRC}${modulo}/handler.js`))[exportado](event);

/**
 * Ordena as chaves de todo objeto: map do DynamoDB não tem ordem estável, então
 * comparar o JSON cru dá falso negativo. Também ordena `schedules` por id.
 */
const canon = (v) => Array.isArray(v) ? v.map(canon)
  : v && typeof v === 'object'
    ? Object.fromEntries(Object.keys(v).sort().map((k) => [k, canon(v[k])]))
    : v;

const resposta = (r) => {
  const corpo = typeof r.body === 'string' ? JSON.parse(r.body) : r.body;
  const c = canon({ status: r.statusCode, body: corpo });
  if (Array.isArray(c.body?.schedules)) {
    c.body.schedules.sort((a, b) => String(a.scheduleId).localeCompare(String(b.scheduleId)));
  }
  return c;
};

const COACH = 'e3fc9a9a-c0c1-706b-32e9-9bbc4b4a57e9';
const STUDENT = '037c4a8a-6031-705c-e02f-8e45f93bd387';
const INTERVALO = {
  startDateTime: '2026-06-01T00:00:00-03:00',
  endDateTime: '2026-11-01T00:00:00-03:00',
};

// [descrição, lambda Python, pasta do módulo Node, export do handler, evento]
const CASOS = [
  ['GET /coach/schedule · ok', 'get-coach-schedule-from-jwt', 'get-own-schedule', 'handler', evt(COACH, INTERVALO)],
  ['GET /coach/schedule · sem params', 'get-coach-schedule-from-jwt', 'get-own-schedule', 'handler', evt(COACH, null)],
  ['GET /student/coach/schedules · ok', 'get-coach-schedule-from-parm', 'get-availability', 'coach', evt(STUDENT, { coachId: COACH, ...INTERVALO })],
  ['GET /student/gyms/schedule · ok', 'get-gym-schedule-from-parm', 'get-availability', 'gym', evt(STUDENT, { gymId: 'gym_sp004', ...INTERVALO })],
];

for (const [nome, pythonFn, modulo, exportado, event] of CASOS) {
  const py = resposta(invocaPython(pythonFn, event));
  let node;
  try {
    node = resposta(await rodaNode(modulo, exportado, event));
  } catch (err) {
    node = { status: 'THROW', body: String(err) };
  }

  const igual = JSON.stringify(py) === JSON.stringify(node);
  console.log(`${igual ? '✓ IGUAL ' : '✗ DIFERE'}  ${nome.padEnd(44)} py=${py.status} node=${node.status}`);
  if (!igual) {
    console.log('    py  :', JSON.stringify(py.body).slice(0, 400));
    console.log('    node:', JSON.stringify(node.body).slice(0, 400));
  }
}
