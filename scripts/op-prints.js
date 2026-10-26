'use strict';

/**
 * Gera prints "de terminal" com a SAÍDA REAL de operações (banco, testes,
 * ataques), renderizando em HTML e fotografando via Chromium.
 *   node scripts/op-prints.js
 */
const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');
const { chromium } = require('playwright');

const OUT = path.join(__dirname, '..', 'prints');
fs.mkdirSync(OUT, { recursive: true });
const esc = (s) => String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');

function run(cmd) {
  try { return execSync(cmd, { encoding: 'utf8', shell: '/bin/bash' }); }
  catch (e) { return (e.stdout || '') + (e.stderr || '') + `\n[exit ${e.status}]`; }
}

function term(titulo, blocos) {
  const body = blocos.map(b =>
    `<div class="cmd"><span class="p">$</span> ${esc(b.cmd)}</div>` +
    `<div class="out">${esc(b.out)}</div>`
  ).join('');
  return `<!doctype html><html><head><meta charset="utf-8"><style>
    body{margin:0;background:#0d1117;font-family:ui-monospace,Menlo,Consolas,monospace}
    .win{padding:0}
    .bar{background:#21262d;padding:8px 12px;color:#c9d1d9;font-family:Arial;font-size:13px;border-bottom:1px solid #30363d}
    .dot{height:11px;width:11px;border-radius:50%;display:inline-block;margin-right:6px}
    .r{background:#ff5f56}.y{background:#ffbd2e}.g{background:#27c93f}
    .scr{padding:14px 16px;color:#c9d1d9;font-size:12.5px;line-height:1.5}
    .cmd{color:#58a6ff;margin:10px 0 2px;white-space:pre-wrap}
    .cmd .p{color:#3fb950;font-weight:bold}
    .out{color:#c9d1d9;white-space:pre-wrap;margin-bottom:6px}
    h2{color:#e6edf3;font-family:Arial;margin:0 0 4px;font-size:15px}
    .sub{color:#8b949e;font-family:Arial;font-size:12px;margin:0 0 6px}
  </style></head><body>
    <div class="bar"><span class="dot r"></span><span class="dot y"></span><span class="dot g"></span>
      &nbsp; aluno@vm-ifsp: ~/marketplace</div>
    <div class="scr"><h2>${esc(titulo)}</h2>${body}</div>
  </body></html>`;
}

const SQL1 = "sudo mysql marketplace -e \"SELECT id,nome,LEFT(senha_hash,30) senha_hash_bcrypt,LEFT(cpf_cifrado,28) cpf_cifrado FROM usuarios\\\\G\"";
const SQL2 = "sudo mysql marketplace -e \"SELECT pedido_id,LEFT(cartao_cifrado,40) cartao_cifrado,ultimos4,bandeira FROM pagamentos\\\\G\"";
const SQL3 = "sudo mysql marketplace -e \"SELECT acao,detalhe,ip FROM logs_auditoria ORDER BY id DESC LIMIT 6\"";

const docs = [
  ['11-op-banco-dados-cifrados.png', term(
    'Banco de dados: senhas em bcrypt e dados sensíveis cifrados (AES-256-GCM)',
    [
      { cmd: SQL1.replace(/\\\\/g,'\\'), out: run(SQL1) },
      { cmd: SQL2.replace(/\\\\/g,'\\'), out: run(SQL2) },
    ])],
  ['12-op-auditoria.png', term(
    'Logs de auditoria (OWASP A09) registrando login e compra',
    [{ cmd: SQL3, out: run(SQL3) }])],
  ['13-op-teste-automatizado.png', term(
    'Teste automatizado: SQLi e IDOR bloqueados no modo seguro',
    [{ cmd: 'node tests/pentest.js', out: run('cd '+path.join(__dirname,'..')+' && node tests/pentest.js') }])],
  ['14-op-sqli-bloqueado-seguro.png', term(
    'Modo SEGURO: SQL Injection no login retorna HTTP 401 (bloqueado)',
    [{ cmd: "curl -s -o /dev/null -w 'HTTP %{http_code}\\n' -X POST .../login  --data \"email=' OR '1'='1' -- \"",
       out: run(`cd ${path.join(__dirname,'..')}; J=/tmp/pj.txt; rm -f $J; C=$(curl -s -c $J http://localhost:3000/login | grep -o 'name=\"_csrf\" value=\"[^\"]*\"' | head -1 | sed 's/.*value=\"//;s/\"//'); curl -s -o /dev/null -w 'resposta: HTTP %{http_code}  (401 = ataque falhou)\\n' -b $J -X POST http://localhost:3000/login --data-urlencode \"email=' OR '1'='1' -- \" --data-urlencode 'senha=x' --data-urlencode \"_csrf=$C\"`) }])],
];

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1100, height: 400 } });
  for (const [nome, html] of docs) {
    await page.setContent(html, { waitUntil: 'load' });
    const el = await page.$('.win') || page;
    await page.screenshot({ path: path.join(OUT, nome), fullPage: true });
    console.log('print: prints/' + nome);
  }
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
