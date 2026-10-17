// O stage prod atende usuários e divide a conta AWS com o dev: um `deploy:prod`
// digitado por engano no lugar do `deploy:dev` publicaria código não revisado.
// Exigir a variável torna o deploy de prod sempre uma decisão explícita.
const EXPECTED = 'prod';
const received = process.env.CONFIRM_PROD_DEPLOY;

if (received !== EXPECTED) {
  console.error(
    `Deploy de prod bloqueado: CONFIRM_PROD_DEPLOY recebido '${received ?? ''}', esperado '${EXPECTED}'.\n` +
      `Rode: CONFIRM_PROD_DEPLOY=${EXPECTED} pnpm deploy:prod`,
  );
  process.exit(1);
}
