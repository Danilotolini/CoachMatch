/**
 * AWS Lambda - Web Scraping CREF-SP (Consulta de Inscritos)
 *
 * URL alvo : https://cref-sp.implanta.net.br/ServicosOnline/Publico/ConsultaInscritos/
 *
 * OPERAÇÃO — disparo exclusivo por SQS (fila CREF-SP-INPUT)
 * ---------------------------------------------------------
 *   Cada mensagem deve ter body JSON: { "numeroRegistro": "181700-G/SP" }
 *   (também aceita o número puro no body, ex.: "181700-G/SP").
 *   O resultado de cada mensagem é gravado na fila CREF-SP-OUTPUT.
 *   Falhas transitórias (timeout/captcha/servidor) voltam pra fila via
 *   "batchItemFailures" (requer "Report batch item failures" habilitado
 *   no event source mapping).
 *
 * Resultado (payload gravado no OUTPUT):
 *   - Sem resultado:
 *       { "encontrado": false, "mensagem": "Sua pesquisa não retornou nenhum resultado", "numeroRegistro": "..." }
 *   - Com resultado:
 *       { "encontrado": true,  "nome": "FULANO DE TAL", "numeroRegistro": "..." }
 */

const chromium  = require('@sparticuz/chromium');
const puppeteer = require('puppeteer-core');
const axios     = require('axios');
const { SQSClient, SendMessageCommand } = require('@aws-sdk/client-sqs');

// ---------- Config ----------
const TWOCAPTCHA_API_KEY = process.env.TWOCAPTCHA_API_KEY || '71a16578e142ed4536845199250a2cbb';
const TARGET_URL         = 'https://cref-sp.implanta.net.br/ServicosOnline/Publico/ConsultaInscritos/';
const NAV_TIMEOUT_MS     = 45_000;
const RESULT_TIMEOUT_MS  = 45_000;
const CAPTCHA_POLL_MS    = 5_000;
const CAPTCHA_MAX_TRIES  = 40; // ~3min30s

// ---------- Config SQS ----------
// ARN da fila de saída (sobrescrevível por env var). A URL é derivada do ARN.
const OUTPUT_QUEUE_ARN = process.env.OUTPUT_QUEUE_ARN
  || 'arn:aws:sqs:sa-east-1:138413505977:CREF-SP-OUTPUT';

const _outArn = parseSqsArn(OUTPUT_QUEUE_ARN);
const SQS_REGION       = process.env.AWS_REGION || _outArn.region || 'sa-east-1';
const OUTPUT_QUEUE_URL = process.env.OUTPUT_QUEUE_URL
  || `https://sqs.${_outArn.region}.amazonaws.com/${_outArn.accountId}/${_outArn.name}`;

const sqsClient = new SQSClient({ region: SQS_REGION });

/** Quebra um ARN de fila SQS em { region, accountId, name }. */
function parseSqsArn(arn) {
  // arn:aws:sqs:<region>:<accountId>:<name>
  const p = String(arn || '').split(':');
  return { region: p[3], accountId: p[4], name: p[5] };
}

// ---------- Helpers ----------

/**
 * Resolve um Google reCAPTCHA v2 via 2captcha.
 * Retorna o token (g-recaptcha-response).
 */
async function solveRecaptchaV2(siteKey, pageUrl) {
  console.log('[2captcha] enviando captcha. siteKey=%s', siteKey);

  const submit = await axios.get('https://2captcha.com/in.php', {
    params: {
      key:       TWOCAPTCHA_API_KEY,
      method:    'userrecaptcha',
      googlekey: siteKey,
      pageurl:   pageUrl,
      json:      1,
    },
    timeout: 30_000,
  });

  if (submit.data.status !== 1) {
    throw new Error(`2captcha submit falhou: ${JSON.stringify(submit.data)}`);
  }
  const requestId = submit.data.request;
  console.log('[2captcha] request id=%s; aguardando solução...', requestId);

  for (let i = 0; i < CAPTCHA_MAX_TRIES; i++) {
    await sleep(CAPTCHA_POLL_MS);

    const res = await axios.get('https://2captcha.com/res.php', {
      params: {
        key:    TWOCAPTCHA_API_KEY,
        action: 'get',
        id:     requestId,
        json:   1,
      },
      timeout: 30_000,
    });

    if (res.data.status === 1) {
      console.log('[2captcha] resolvido em ~%ss', ((i + 1) * CAPTCHA_POLL_MS) / 1000);
      return res.data.request; // token
    }

    if (res.data.request && res.data.request !== 'CAPCHA_NOT_READY') {
      throw new Error(`2captcha erro: ${res.data.request}`);
    }
  }
  throw new Error('2captcha: tempo esgotado para resolver o captcha');
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Tenta achar o site key do reCAPTCHA na página.
 * Procura no atributo data-sitekey de divs .g-recaptcha
 * e também em scripts/iframes (fallback).
 */
async function findRecaptchaSiteKey(page) {
  return await page.evaluate(() => {
    const el = document.querySelector('.g-recaptcha[data-sitekey], [data-sitekey]');
    if (el) return el.getAttribute('data-sitekey');

    const iframe = document.querySelector('iframe[src*="recaptcha"]');
    if (iframe) {
      const m = iframe.src.match(/[?&]k=([^&]+)/);
      if (m) return decodeURIComponent(m[1]);
    }
    return null;
  });
}

/**
 * Injeta o token do reCAPTCHA. O site chama `grecaptcha.getResponse()`
 * (API do Google) em vez de ler o <textarea>, então sobrescrevemos
 * essa função para devolver o nosso token. Também:
 *   - Setamos o textarea (caso algum código antigo use);
 *   - Disparamos quaisquer callbacks registrados pelo widget;
 *   - Esperamos um instante para qualquer handler async terminar.
 */
async function injectRecaptchaToken(page, token) {
  await page.evaluate((token) => {
    // 1. Textarea visível para o servidor (form post tradicional)
    let textarea = document.getElementById('g-recaptcha-response');
    if (!textarea) {
      textarea = document.createElement('textarea');
      textarea.id = 'g-recaptcha-response';
      textarea.name = 'g-recaptcha-response';
      textarea.style.display = 'none';
      document.body.appendChild(textarea);
    }
    textarea.value     = token;
    textarea.innerHTML = token;

    // 2. **Sobrescreve grecaptcha.getResponse** — é o que o Knockout chama.
    //    A função aceita opcionalmente um widget id; nosso override ignora isso
    //    e devolve o token incondicionalmente.
    if (window.grecaptcha && typeof window.grecaptcha.getResponse === 'function') {
      window.grecaptcha.getResponse = function () { return token; };
    } else {
      // Se grecaptcha ainda não carregou, planta uma stub que vai sobreviver
      // ao carregamento (raríssimo, mas defensivo).
      window.grecaptcha = window.grecaptcha || {};
      window.grecaptcha.getResponse = function () { return token; };
    }

    // 3. Dispara callbacks registrados via `data-callback` ou opções do render()
    try {
      if (window.___grecaptcha_cfg && window.___grecaptcha_cfg.clients) {
        const clients = window.___grecaptcha_cfg.clients;
        Object.keys(clients).forEach((cid) => {
          const walk = (obj, depth = 0) => {
            if (!obj || typeof obj !== 'object' || depth > 6) return;
            Object.keys(obj).forEach((k) => {
              const v = obj[k];
              if (v && typeof v === 'object') {
                if (typeof v.callback === 'function') {
                  try { v.callback(token); } catch (_) {}
                }
                walk(v, depth + 1);
              }
            });
          };
          walk(clients[cid]);
        });
      }
    } catch (_) { /* ignora */ }
  }, token);

  // Pequena pausa para handlers async assentarem
  await sleep(800);
}

/** Clica no botão "Consultar". Tenta seletor explícito primeiro,
 *  depois fallback por texto, e por fim submete o form pai diretamente. */
async function clickConsultar(page) {
  const clicked = await page.evaluate(() => {
    // 1) Botões/links com texto "Consultar"
    const all = Array.from(
      document.querySelectorAll('button, input[type="submit"], input[type="button"], a, [role="button"]')
    );
    const byText = all.find((el) => {
      const txt = (el.innerText || el.value || el.textContent || '').trim().toLowerCase();
      return txt === 'consultar' || txt.startsWith('consultar');
    });
    if (byText) { byText.click(); return 'text:' + (byText.tagName || ''); }

    // 2) Atributos de bind comuns (Knockout / Angular)
    const byBind = document.querySelector(
      '[data-bind*="consultar" i], [ng-click*="consultar" i], [onclick*="consultar" i]'
    );
    if (byBind) { byBind.click(); return 'bind'; }

    // 3) Fallback: submit do form que contém o NumeroRegistro
    const input = document.querySelector('#NumeroRegistro, input[name="NumeroRegistro"]');
    if (input) {
      const form = input.closest('form');
      if (form) {
        if (typeof form.requestSubmit === 'function') form.requestSubmit();
        else form.submit();
        return 'form-submit';
      }
    }
    return null;
  });

  if (!clicked) throw new Error('Botão "Consultar" não encontrado');
  console.log('[lambda] consultar acionado via: %s', clicked);
}

/**
 * Aguarda o resultado da consulta. Estratégia em camadas:
 *   1. Escuta XHRs JSON disparadas pelo site após o clique;
 *   2. Olha o DOM em paralelo (texto "não retornou" ou cards);
 *   3. Vence quem chegar primeiro.
 *
 * Retorna { source, payload, text } onde:
 *   - source: "xhr" | "dom"
 *   - payload: objeto JSON da XHR (se source === "xhr")
 *   - text: innerText do body no momento (sempre presente)
 */
async function waitForResult(page, captured) {
  const TIMEOUT = 60_000;

  // Promise A: chegou XHR JSON com cara de RESULTADO (não filtro vazio)
  const xhrPromise = new Promise((resolve) => {
    const check = () => {
      const hit = captured.responses.find(
        (r) =>
          /consulta|inscrito|pesquisa|search|buscar/i.test(r.url) &&
          r.json !== undefined &&
          looksLikeResult(r.json)
      );
      if (hit) resolve({ source: 'xhr', payload: hit.json, url: hit.url });
    };
    captured.onUpdate = check;
    check();
  });

  // Promise B: DOM mostra "não retornou" ou um card de resultado
  const domPromise = page.waitForFunction(() => {
    const txt = (document.body.innerText || '').toLowerCase();
    if (txt.includes('não retornou nenhum resultado')) return 'no-result';
    if (txt.includes('nao retornou nenhum resultado')) return 'no-result';

    const card = document.querySelector(
      '.lista-resultados li, .resultado-busca, .card-inscrito, ' +
      '[class*="resultado"] [class*="nome"], .panel .nome, ' +
      '.dados-pessoa, [data-bind*="nome" i]'
    );
    if (card) return 'card';
    return false;
  }, { timeout: TIMEOUT, polling: 400 }).then((handle) => handle.jsonValue().then((v) => ({ source: 'dom', dom: v })));

  // Timeout combinado
  const timeoutPromise = new Promise((_, reject) =>
    setTimeout(() => reject(new Error(`Waiting failed: ${TIMEOUT}ms exceeded`)), TIMEOUT)
  );

  const winner = await Promise.race([xhrPromise, domPromise, timeoutPromise]).catch((e) => ({ error: e }));

  // Sempre captura snapshot (pra debug)
  const text = await page.evaluate(() => document.body.innerText || '').catch(() => '');
  return { ...winner, text };
}

/**
 * Heurística para distinguir o JSON de RESULTADO da chamada de filtro inicial
 * (que carrega o estado padrão antes do clique e tem todos os campos null).
 * Aceita como resultado:
 *   - Resposta com Items/Resultados/Lista (array, mesmo vazio — significa que a busca rodou)
 *   - Resposta com Total/TotalRegistros como número
 *   - Resposta com NumeroRegistro/Nome preenchidos em algum lugar
 */
function looksLikeResult(payload) {
  if (!payload || typeof payload !== 'object') return false;

  const containers = [];
  const collect = (o) => {
    if (!o || typeof o !== 'object') return;
    containers.push(o);
    for (const v of Object.values(o)) {
      if (v && typeof v === 'object' && !Array.isArray(v)) collect(v);
    }
  };
  collect(payload);

  for (const c of containers) {
    // Tem array de itens?
    for (const k of ['Items', 'items', 'Resultados', 'Resultado', 'Lista', 'lista', 'Records', 'rows']) {
      if (Array.isArray(c[k])) return true;
    }
    // Tem campo de contagem numérico?
    for (const k of ['Total', 'TotalRegistros', 'TotalItens', 'TotalRows', 'Count']) {
      if (typeof c[k] === 'number') return true;
    }
    // Tem nome ou registro preenchido?
    for (const k of Object.keys(c)) {
      if (/^nome($|[A-Z_])/i.test(k) && typeof c[k] === 'string' && c[k].trim()) return true;
      if (/^numeroRegistro$/i.test(k) && typeof c[k] === 'string' && c[k].trim()) return true;
    }
  }
  return false;
}

/** Liga interceptação de respostas para capturar a XHR de consulta. */
function setupResponseCapture(page) {
  const captured = { responses: [], onUpdate: null };

  page.on('response', async (resp) => {
    try {
      const url = resp.url();
      const ct  = (resp.headers()['content-type'] || '').toLowerCase();
      // Só nos interessam JSONs deste host
      if (!ct.includes('json')) return;
      let json;
      try { json = await resp.json(); } catch (_) { return; }
      captured.responses.push({ url, status: resp.status(), json });
      if (captured.onUpdate) captured.onUpdate();
    } catch (_) { /* ignora */ }
  });

  return captured;
}

/** Tenta extrair o nome de um payload JSON arbitrário (heurística profunda). */
function extractNomeFromJson(obj) {
  if (!obj || typeof obj !== 'object') return null;

  // Se for array, pega o primeiro item
  let node = obj;
  if (Array.isArray(node)) node = node[0];
  if (!node) return null;

  // Estruturas comuns Implanta: { Items: [...] }, { Data: [...] }, { Result: {...} }
  for (const key of ['Items', 'Data', 'Result', 'Resultado', 'Resultados', 'Lista']) {
    if (Array.isArray(node[key]) && node[key].length) {
      const r = extractNomeFromJson(node[key][0]);
      if (r) return r;
    }
    if (node[key] && typeof node[key] === 'object') {
      const r = extractNomeFromJson(node[key]);
      if (r) return r;
    }
  }

  // Campos diretos com cara de "nome"
  for (const key of Object.keys(node)) {
    if (/^nome($|[A-Z_])/i.test(key) || /^name$/i.test(key)) {
      const val = node[key];
      if (typeof val === 'string' && val.trim().length > 2) return val.trim();
    }
  }

  // Walk recursivo
  for (const v of Object.values(node)) {
    if (v && typeof v === 'object') {
      const r = extractNomeFromJson(v);
      if (r) return r;
    }
  }
  return null;
}

/** Extrai o nome do inscrito da página de resultado. */
async function extractNome(page) {
  return await page.evaluate(() => {
    const tryText = (sel) => {
      const el = document.querySelector(sel);
      return el && el.innerText ? el.innerText.trim() : null;
    };

    // Várias heurísticas — a primeira que devolver algo plausível, vence.
    const candidates = [
      '.lista-resultados li .nome',
      '.lista-resultados .nome',
      '.resultado-busca .nome',
      '.card-inscrito .nome',
      '.panel .nome',
      '[class*="nome-pessoa"]',
      '[class*="nome-inscrito"]',
      'h2.nome',
      'h3.nome',
    ];

    for (const sel of candidates) {
      const t = tryText(sel);
      if (t && t.length > 2) return t;
    }

    // Fallback: pega o maior texto em caixa-alta dentro de um item de lista
    const items = Array.from(document.querySelectorAll('.lista-resultados li, [class*="resultado"] li, .panel'));
    for (const it of items) {
      const txt = (it.innerText || '').split('\n').map((s) => s.trim()).filter(Boolean);
      const upper = txt.find((s) => s.length > 3 && s === s.toUpperCase() && /[A-ZÁ-Ú]/.test(s));
      if (upper) return upper;
    }
    return null;
  });
}

/** Extrai a lista de itens (registros) de um payload JSON arbitrário. */
function extractItemsFromJson(payload) {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload;

  for (const key of ['Items', 'items', 'Data', 'data', 'Result', 'Resultados', 'Resultado', 'Lista', 'lista']) {
    if (Array.isArray(payload[key])) return payload[key];
    if (payload[key] && typeof payload[key] === 'object') {
      const inner = extractItemsFromJson(payload[key]);
      if (inner.length) return inner;
    }
  }

  // Se o payload tem cara de "registro único" (tem chave Nome/Name), trata como 1 item
  for (const key of Object.keys(payload)) {
    if (/^nome($|[A-Z_])/i.test(key) || /^name$/i.test(key)) {
      return [payload];
    }
  }

  return [];
}

/** Captura snapshot da página para diagnóstico. */
async function capturePageSnapshot(page, captured) {
  if (!page) return { error: 'page is null' };
  try {
    const [html, text, url] = await Promise.all([
      page.content().catch((e) => `<!-- erro ao capturar HTML: ${e.message} -->`),
      page.evaluate(() => document.body ? document.body.innerText : '').catch(() => ''),
      page.url(),
    ]);

    // Trunca pra não estourar o response da Lambda (6MB)
    const trunc = (s, n) => (typeof s === 'string' && s.length > n ? s.slice(0, n) + `…[truncado, total ${s.length}b]` : s);

    return {
      url,
      bodyText:        trunc(text, 5_000),
      htmlPreview:     trunc(html, 30_000),
      xhrJsonResponses: (captured?.responses || []).map((r) => ({
        url:     r.url,
        status:  r.status,
        // Só os primeiros 3KB do payload pra não explodir o response
        payload: trunc(JSON.stringify(r.json), 3_000),
      })),
    };
  } catch (e) {
    return { error: e.message };
  }
}

// ---------- Browser ----------
async function launchBrowser() {
  console.log('[lambda] iniciando Chromium...');
  return await puppeteer.launch({
    args:            chromium.args,
    defaultViewport: chromium.defaultViewport,
    executablePath:  await chromium.executablePath(),
    headless:        chromium.headless,
  });
}

/**
 * Executa a consulta para UM numeroRegistro usando um browser já aberto.
 * Retorna { statusCode, payload }. Não fecha o browser (reuso entre mensagens).
 */
async function executarConsulta(browser, numeroRegistro, debug) {
  let page     = null;
  let captured;

  try {
    page = await browser.newPage();
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
      '(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    );

    // Captura JSONs já desde o início
    captured = setupResponseCapture(page);

    console.log('[lambda] abrindo %s', TARGET_URL);
    await page.goto(TARGET_URL, { waitUntil: 'networkidle2', timeout: NAV_TIMEOUT_MS });

    // 1. Preenche o campo NumeroRegistro.
    //    Estratégia em duas fases:
    //      (a) digita normal pra disparar handlers de keypress/keyup;
    //      (b) seta o valor final via JS + dispara input/change pra forçar o
    //          binding (Knockout/Angular) a aceitar caracteres como "-" e "/".
    await page.waitForSelector('#NumeroRegistro, input[name="NumeroRegistro"]', { timeout: 15_000 });
    const inputSelector = (await page.$('#NumeroRegistro')) ? '#NumeroRegistro' : 'input[name="NumeroRegistro"]';

    // (a) limpa e digita
    await page.click(inputSelector, { clickCount: 3 });
    await page.keyboard.press('Backspace');
    await page.type(inputSelector, numeroRegistro, { delay: 30 });

    // (b) força o valor final via JS (caso a máscara tenha filtrado)
    await page.evaluate((selector, value) => {
      const el = document.querySelector(selector);
      if (!el) return;

      // setter nativo, ignorando getters/setters customizados que podem filtrar
      const proto  = Object.getPrototypeOf(el);
      const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
      if (setter) setter.call(el, value); else el.value = value;

      // dispara eventos que frameworks escutam
      el.dispatchEvent(new Event('input',  { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
      el.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true, key: 'Enter' }));

      // Knockout bindings: força aplicação síncrona se ko estiver disponível
      if (window.ko && window.ko.dataFor) {
        try {
          const ctx = window.ko.contextFor(el);
          if (ctx && ctx.$data) {
            const binding = el.getAttribute('data-bind') || '';
            const m = binding.match(/value:\s*([\w$.]+)/);
            if (m) {
              const path = m[1].split('.');
              let target = ctx.$data;
              while (path.length > 1) target = target[path.shift()];
              const last = path[0];
              if (target && typeof target[last] === 'function') {
                target[last](value); // observable
              } else if (target) {
                target[last] = value;
              }
            }
          }
        } catch (_) { /* ignora */ }
      }
    }, inputSelector, numeroRegistro);

    // Confirma o valor que ficou no DOM
    const valorReal = await page.$eval(inputSelector, (el) => el.value);
    console.log('[lambda] NumeroRegistro pretendido="%s", aceito pelo campo="%s"', numeroRegistro, valorReal);

    // 2. Resolve captcha (se houver).
    const siteKey = await findRecaptchaSiteKey(page);
    if (siteKey) {
      const token = await solveRecaptchaV2(siteKey, TARGET_URL);
      await injectRecaptchaToken(page, token);
      console.log('[lambda] token do reCAPTCHA injetado');
    } else {
      console.log('[lambda] AVISO: nenhum reCAPTCHA encontrado na página');
    }

    // 3. Limpa capturas e arma waitForResponse ANTES do clique (canônico do Puppeteer).
    captured.responses.length = 0;
    captured.onUpdate = null;

    const SEARCH_TIMEOUT = 90_000;
    const responsePromise = page
      .waitForResponse(
        (resp) => {
          // Aceita qualquer response cuja URL bata com endpoint de busca, e que tenha
          // sido feito após o clique (já zeramos o array antes).
          const url = resp.url();
          return /BuscarFiltro|ConsultaInscritos\/Buscar|Pesquisa|Search/i.test(url);
        },
        { timeout: SEARCH_TIMEOUT }
      )
      .catch((e) => ({ __error: e.message }));

    // 4. Clica em "Consultar".
    await clickConsultar(page);
    console.log('[lambda] clicou em Consultar; aguardando resposta da busca...');

    const response = await responsePromise;

    // 5. Trata erro/timeout do waitForResponse.
    if (!response || response.__error) {
      const snapshot = await capturePageSnapshot(page, captured);
      return { statusCode: 504, payload: {
        error:    'Timeout aguardando resposta da busca.',
        detalhe:  response && response.__error ? response.__error : 'sem resposta',
        numeroRegistro,
        snapshot,
      } };
    }

    const respUrl    = response.url();
    const respStatus = response.status();
    let   respJson;
    try { respJson = await response.json(); } catch (e) { respJson = null; }
    console.log('[lambda] resposta da busca: %s %s (json=%s)', respStatus, respUrl, !!respJson);

    if (!respJson) {
      const respText = await response.text().catch(() => '');
      const snapshot = await capturePageSnapshot(page, captured);
      return { statusCode: 502, payload: {
        error:        'Resposta da busca não veio em JSON.',
        status:       respStatus,
        url:          respUrl,
        bodyPreview:  String(respText).slice(0, 1500),
        numeroRegistro,
        snapshot,
      } };
    }

    // 6. Parse do payload.
    const itens = extractItemsFromJson(respJson);
    if (itens.length === 0) {
      return { statusCode: 200, payload: {
        encontrado:    false,
        mensagem:      'Sua pesquisa não retornou nenhum resultado',
        numeroRegistro,
        ...(debug ? { _debug: { source: 'xhr', url: respUrl, payload: respJson } } : {}),
      } };
    }
    const nome = extractNomeFromJson(itens[0]) || extractNomeFromJson(respJson);
    if (nome) {
      return { statusCode: 200, payload: {
        encontrado:    true,
        nome,
        numeroRegistro,
        ...(debug ? { _debug: { source: 'xhr', url: respUrl, payload: respJson } } : {}),
      } };
    }
    // JSON veio com itens mas não achei o nome — devolve o payload pra eu ajustar.
    return { statusCode: 200, payload: {
      encontrado:    true,
      nome:          null,
      aviso:         'XHR teve resultado mas não consegui extrair o nome do payload abaixo.',
      payload:       respJson,
      numeroRegistro,
    } };
  } finally {
    if (page) {
      try { await page.close(); } catch (_) {}
    }
  }
}

/**
 * Handler — disparado pela fila SQS CREF-SP-INPUT.
 * Processa cada mensagem, grava o resultado na CREF-SP-OUTPUT, e devolve
 * batchItemFailures para reprocessar falhas transitórias.
 */
exports.handler = async (event) => {
  const batchItemFailures = [];
  let browser = null;

  try {
    browser = await launchBrowser();

    for (const record of event.Records) {
      const messageId = record.messageId;
      try {
        const { numeroRegistro, debug } = parseSqsRecord(record);

        if (!numeroRegistro) {
          // Mensagem malformada: não adianta reprocessar. Grava erro no OUTPUT e segue.
          console.warn('[sqs] record %s sem numeroRegistro — pulando', messageId);
          await enviarParaOutput({
            erro:         'Mensagem sem "numeroRegistro".',
            bodyOriginal: record.body,
            messageId,
          });
          continue;
        }

        console.log('[sqs] processando %s (msg %s)', numeroRegistro, messageId);
        const { statusCode, payload } = await executarConsulta(browser, numeroRegistro, debug);

        // 5xx = falha transitória (timeout/captcha/servidor) → reprocessa via SQS.
        if (statusCode >= 500) {
          console.warn('[sqs] falha transitória (%s) em %s — voltando pra fila', statusCode, numeroRegistro);
          batchItemFailures.push({ itemIdentifier: messageId });
          continue;
        }

        // Resultado válido (encontrado true/false) → grava no OUTPUT.
        await enviarParaOutput(payload, record);
        console.log('[sqs] resultado de %s gravado no OUTPUT', numeroRegistro);
      } catch (err) {
        console.error('[sqs] erro inesperado no record %s: %s', messageId, err.message);
        batchItemFailures.push({ itemIdentifier: messageId });
      }
    }
  } catch (err) {
    // Falha ao subir o browser etc → tudo volta pra fila.
    console.error('[sqs] erro fatal no batch:', err);
    return { batchItemFailures: event.Records.map((r) => ({ itemIdentifier: r.messageId })) };
  } finally {
    if (browser) { try { await browser.close(); } catch (_) {} }
  }

  return { batchItemFailures };
}

/** Extrai { numeroRegistro, debug } do body de uma mensagem SQS. */
function parseSqsRecord(record) {
  const body = record && record.body;
  if (!body) return { numeroRegistro: null, debug: false };

  try {
    const obj = JSON.parse(body);
    if (obj && typeof obj === 'object') {
      const num = obj.numeroRegistro != null ? String(obj.numeroRegistro) : null;
      const debug = obj.debug === true || obj.debug === 'true';
      return { numeroRegistro: num, debug };
    }
  } catch (_) {
    // body não é JSON — trata como o número puro
  }
  const raw = String(body).trim();
  return { numeroRegistro: raw || null, debug: false };
}

/** Envia o payload do resultado para a fila CREF-SP-OUTPUT. */
async function enviarParaOutput(payload, sourceRecord) {
  const message = {
    QueueUrl:    OUTPUT_QUEUE_URL,
    MessageBody: JSON.stringify(payload),
  };
  // Propaga correlação se a mensagem de origem trouxe um messageId
  if (sourceRecord && sourceRecord.messageId) {
    message.MessageAttributes = {
      sourceMessageId: { DataType: 'String', StringValue: String(sourceRecord.messageId) },
    };
  }
  await sqsClient.send(new SendMessageCommand(message));
}
