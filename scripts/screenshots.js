'use strict';

/**
 * Captura prints das telas do sistema (modo SEGURO) via Chromium/Playwright.
 *   node scripts/screenshots.js
 */
const path = require('path');
const fs = require('fs');
const { chromium } = require('playwright');

const BASE = 'http://localhost:3000';
const OUT = path.join(__dirname, '..', 'prints');
fs.mkdirSync(OUT, { recursive: true });

async function shot(page, nome) {
  await page.screenshot({ path: path.join(OUT, nome), fullPage: true });
  console.log('print: prints/' + nome);
}

async function login(page, email, senha) {
  await page.goto(BASE + '/login', { waitUntil: 'networkidle' });
  await page.fill('input[name=email]', email);
  await page.fill('input[name=senha]', senha);
  await Promise.all([page.waitForLoadState('networkidle'), page.click('button[type=submit]')]);
}

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 860 }, ignoreHTTPSErrors: true });
  const page = await ctx.newPage();

  // Público
  await page.goto(BASE + '/', { waitUntil: 'networkidle' });
  await shot(page, '01-catalogo.png');
  await page.goto(BASE + '/login', { waitUntil: 'networkidle' });
  await shot(page, '02-login.png');
  await page.goto(BASE + '/cadastro', { waitUntil: 'networkidle' });
  await shot(page, '03-cadastro.png');
  await page.goto(BASE + '/produto/1', { waitUntil: 'networkidle' });
  await shot(page, '04-produto.png');

  // Cliente (Maria)
  await login(page, 'maria@email.com', 'Cliente@123');
  // Adiciona 2 produtos ao carrinho
  await page.goto(BASE + '/produto/3', { waitUntil: 'networkidle' });
  await page.click('button:has-text("Adicionar ao carrinho")');
  await page.goto(BASE + '/produto/2', { waitUntil: 'networkidle' });
  await page.click('button:has-text("Adicionar ao carrinho")');
  await page.goto(BASE + '/carrinho', { waitUntil: 'networkidle' });
  await shot(page, '05-carrinho.png');
  await page.goto(BASE + '/checkout', { waitUntil: 'networkidle' });
  await shot(page, '06-checkout.png');
  await page.goto(BASE + '/conta', { waitUntil: 'networkidle' });
  await shot(page, '07-conta-dados-sensiveis.png');
  await page.goto(BASE + '/pedidos', { waitUntil: 'networkidle' });
  await shot(page, '08-meus-pedidos.png');
  await page.goto(BASE + '/pedidos/1', { waitUntil: 'networkidle' });
  await shot(page, '09-pedido-detalhe.png');

  // Admin
  const ctx2 = await browser.newContext({ viewport: { width: 1280, height: 860 }, ignoreHTTPSErrors: true });
  const padmin = await ctx2.newPage();
  await login(padmin, 'admin@marketplace.local', 'Admin@2026');
  await padmin.goto(BASE + '/admin', { waitUntil: 'networkidle' });
  await shot(padmin, '10-admin-usuarios-auditoria.png');

  await browser.close();
  console.log('OK');
})().catch((e) => { console.error(e); process.exit(1); });
