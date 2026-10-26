'use strict';

/**
 * Compila todos os prints em um único PDF de evidências, com seções e legendas.
 *   node scripts/gerar-evidencias-pdf.js
 */
const path = require('path');
const fs = require('fs');
const { chromium } = require('playwright');

const P = path.join(__dirname, '..', 'prints');
const OUT = path.join(__dirname, '..', 'entrega');
fs.mkdirSync(OUT, { recursive: true });

const img = (nome) => {
  const b = fs.readFileSync(path.join(P, nome)).toString('base64');
  return `data:image/png;base64,${b}`;
};

const secoes = [
  { titulo: '1. O sistema (modo seguro)', itens: [
    ['01-catalogo.png', 'Catálogo de produtos (página inicial pública).'],
    ['02-login.png', 'Tela de login.'],
    ['03-cadastro.png', 'Cadastro de usuário com política de senha.'],
    ['04-produto.png', 'Página de produto com avaliações.'],
    ['05-carrinho.png', 'Carrinho de compras.'],
    ['06-checkout.png', 'Checkout: endereço de entrega + pagamento.'],
    ['07-conta-dados-sensiveis.png', 'Minha conta: CPF exibido MASCARADO (armazenado cifrado).'],
    ['08-meus-pedidos.png', 'Lista de pedidos do usuário.'],
    ['09-pedido-detalhe.png', 'Detalhe do pedido: itens, entrega e cartão mascarado.'],
    ['10-admin-usuarios-auditoria.png', 'Painel admin: usuários (CPF mascarado) e logs de auditoria.'],
  ]},
  { titulo: '2. Operações rodando (evidências técnicas — modo seguro)', itens: [
    ['11-op-banco-dados-cifrados.png', 'Banco: senhas em bcrypt ($2b$12$) e CPF/cartão cifrados (AES-256-GCM) — ilegíveis.'],
    ['12-op-auditoria.png', 'Tabela logs_auditoria registrando LOGIN_OK e COMPRA com IP.'],
    ['13-op-teste-automatizado.png', 'Teste automatizado: SQLi e IDOR bloqueados (3/3 OK).'],
    ['14-op-sqli-bloqueado-seguro.png', 'SQL Injection no login retorna HTTP 401 (ataque falhou).'],
  ]},
  { titulo: '3. Ataques BEM-SUCEDIDOS (modo vulnerável — para documentação do pentest)', itens: [
    ['15-ataque-sqli-login-payload.png', "SQL Injection: payload ' OR '1'='1'# no campo de e-mail."],
    ['16-ataque-sqli-logado-como-admin.png', 'Resultado: autenticado como ADMINISTRADOR sem senha válida.'],
    ['17-ataque-xss-armazenado.png', 'XSS armazenado: script/HTML injetado numa avaliação executa na página.'],
    ['18-ataque-idor-pedido-alheio.png', 'IDOR: Carlos (cliente) acessa o pedido da Maria (endereço e cartão dela).'],
    ['19-ataque-erro-verboso-vaza-sql.png', 'Erro verboso: vaza erro de SQL e stack trace (information disclosure).'],
  ]},
];

let body = `<h1>Evidências / Prints do Marketplace</h1>
<p class="intro">Segurança de Sistemas — IFSP Caraguatatuba. Nome de guerra: <b>TutisTutis</b>.
Dados sensíveis são fictícios. Seções 1 e 2 = sistema em modo seguro (OWASP);
seção 3 = modo vulnerável ligado por flags, para demonstrar os ataques.</p>`;

for (const s of secoes) {
  body += `<h2>${s.titulo}</h2>`;
  for (const [nome, legenda] of s.itens) {
    body += `<div class="fig"><div class="cap">${legenda}</div>
      <img src="${img(nome)}"><div class="arq">${nome}</div></div>`;
  }
}

const html = `<!doctype html><html lang="pt-br"><head><meta charset="utf-8"><style>
  @page { size: A4; margin: 14mm; }
  body { font-family: Arial, Helvetica, sans-serif; color: #1f2933; }
  h1 { color: #0d47a1; font-size: 20px; margin: 0 0 6px; }
  .intro { color: #444; font-size: 11px; margin: 0 0 14px; }
  h2 { color: #0d47a1; font-size: 14px; border-bottom: 2px solid #0d47a1;
       padding-bottom: 3px; margin: 18px 0 10px; page-break-after: avoid; }
  .fig { page-break-inside: avoid; margin-bottom: 14px; }
  .cap { font-size: 11px; font-weight: bold; margin-bottom: 4px; }
  .arq { font-size: 9px; color: #888; margin-top: 2px; }
  img { width: 100%; border: 1px solid #ccc; border-radius: 4px; display: block; }
</style></head><body>${body}</body></html>`;

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: 'load' });
  await page.pdf({ path: path.join(OUT, 'EVIDENCIAS-PRINTS.pdf'), format: 'A4',
    printBackground: true, margin: { top: '14mm', bottom: '14mm', left: '14mm', right: '14mm' } });
  await browser.close();
  console.log('gerado: entrega/EVIDENCIAS-PRINTS.pdf');
})().catch(e => { console.error(e); process.exit(1); });
