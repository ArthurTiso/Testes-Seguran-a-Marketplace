'use strict';

/**
 * Gera os 4 PDFs das planilhas de teste (modelo da disciplina), preenchidos
 * com os dados deste sistema. Renderiza HTML -> PDF via Chromium (Playwright).
 *   node scripts/gerar-pdfs.js
 */
const path = require('path');
const fs = require('fs');
const { chromium } = require('playwright');

const OUT = path.join(__dirname, '..', 'entrega');
fs.mkdirSync(OUT, { recursive: true });

const esc = (s) => String(s == null ? '' : s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function doc({ titulo, subtitulo, colunas, linhas, larguras }) {
  const ths = colunas.map((c, i) =>
    `<th${larguras && larguras[i] ? ` style="width:${larguras[i]}"` : ''}>${esc(c)}</th>`).join('');
  const trs = linhas.map((row) =>
    '<tr>' + row.map((cell, i) =>
      `<td class="${i === 0 ? 'c-id' : ''}">${esc(cell).replace(/\n/g, '<br>')}</td>`).join('') + '</tr>'
  ).join('');
  return `<!doctype html><html lang="pt-br"><head><meta charset="utf-8"><style>
    @page { size: A4 landscape; margin: 12mm; }
    * { box-sizing: border-box; }
    body { font-family: Arial, Helvetica, sans-serif; color: #1f2933; font-size: 10px; }
    h1 { font-size: 16px; margin: 0 0 2px; color: #0d47a1; }
    .sub { color: #555; font-size: 10px; margin: 0 0 10px; }
    table { width: 100%; border-collapse: collapse; }
    th, td { border: 1px solid #999; padding: 5px 6px; text-align: left; vertical-align: top; }
    th { background: #0d47a1; color: #fff; font-size: 10px; }
    tr:nth-child(even) td { background: #f2f5f9; }
    td.c-id { text-align: center; font-weight: bold; width: 34px; }
    .rodape { margin-top: 10px; color: #777; font-size: 9px; }
    .ok { color: #1b5e20; font-weight: bold; }
    .pos { color: #b71c1c; font-weight: bold; }
    a { color: #1565c0; word-break: break-all; }
  </style></head><body>
    <h1>${esc(titulo)}</h1>
    <p class="sub">${subtitulo}</p>
    <table><thead><tr>${ths}</tr></thead><tbody>${trs}</tbody></table>
    <p class="rodape">Marketplace — Segurança de Sistemas (IFSP Caraguatatuba) · Dados fictícios · Gerado em ${new Date().toLocaleDateString('pt-BR')}</p>
  </body></html>`;
}

// ---------------------------------------------------------------------------
// 1) LINKS
// ---------------------------------------------------------------------------
const LINKS = doc({
  titulo: 'LINKS',
  subtitulo: 'Referências utilizadas no projeto e nos testes de segurança.',
  colunas: ['Recurso', 'URL'],
  larguras: ['28%', '72%'],
  linhas: [
    ['Boas práticas OWASP', 'https://owasp.github.io/www-project-secure-coding-practices-quick-reference-guide/stable-en/02-checklist/05-checklist'],
    ['OWASP Top 10 (2021)', 'https://owasp.org/Top10/'],
    ['OWASP Cheat Sheet Series', 'https://cheatsheetseries.owasp.org/'],
    ['NESSUS (Tenable)', 'https://www.tenable.com/downloads/nessus?loginAttempted=true'],
    ['CrackStation (teste de hashes)', 'https://crackstation.net/'],
    ['sqlmap (SQL Injection)', 'https://sqlmap.org/'],
    ['OWASP ZAP', 'https://www.zaproxy.org/'],
    ['nmap', 'https://nmap.org/'],
    ['Formulário de ataques (entrega)', 'https://forms.gle/A2gtAQvuctiVA7rL8'],
  ],
});

// ---------------------------------------------------------------------------
// 2) TESTES DE SEGURANÇA
// ---------------------------------------------------------------------------
const TESTES = doc({
  titulo: 'TESTES DE SEGURANÇA',
  subtitulo: 'Testes de invasão executados. "Resultado" refere-se ao sistema em MODO SEGURO (entrega padrão). Entre parênteses, o comportamento quando a falha é ligada no modo vulnerável.',
  colunas: ['ID', 'TIPO', 'Descrição', 'Resultado', 'Sugestão de Correção (caso teste positivo)'],
  larguras: ['3%', '10%', '34%', '23%', '30%'],
  linhas: [
    ['1', 'FERRAMENTA', 'Testar se os hashes armazenados podem ser quebrados pelo CrackStation', 'Negativo — senhas em bcrypt (custo 12) não são quebradas (Positivo se armazenadas em SHA1)', 'Migrar hashes para bcrypt/argon2 e enviar e-mail ao usuário exigindo a troca de senha'],
    ['2', 'MANUAL', "SQL Injection no login com payload  ' OR '1'='1' --", 'Negativo — retorna HTTP 401 (Positivo no modo vulnerável: autentica como admin)', 'Usar queries parametrizadas (prepared statements) em todas as consultas'],
    ['3', 'FERRAMENTA', 'SQL Injection automatizado na busca de produtos (sqlmap / UNION SELECT)', 'Negativo — parâmetro tratado com placeholder (Positivo no modo vulnerável: extrai e-mails e hashes)', 'Parametrizar a busca (LIKE ?) e validar/escapar a entrada'],
    ['4', 'MANUAL', 'IDOR — acessar /pedidos/ID de outro usuário', 'Negativo — HTTP 403 (Positivo no modo vulnerável: exibe pedido alheio)', 'Verificar a posse do recurso (comprador_id) antes de exibir'],
    ['5', 'MANUAL', 'XSS armazenado em avaliação de produto (<script>...)', 'Negativo — saída escapada + CSP (Positivo no modo vulnerável: script executa)', 'Escapar a saída (output encoding) e aplicar Content-Security-Policy'],
    ['6', 'MANUAL', 'Força bruta no login (tentativas repetidas de senha)', 'Negativo — bloqueio após 5 tentativas e HTTP 429 (Positivo se rate limit desligado)', 'Rate limit por IP + bloqueio temporário de conta + MFA'],
    ['7', 'MANUAL', 'CSRF — enviar POST de ação sem o token', 'Negativo — HTTP 403 (token CSRF obrigatório)', 'Token anti-CSRF por sessão e cookies SameSite'],
    ['8', 'MANUAL', 'Exposição de dados sensíveis no banco (CPF, cartão)', 'Negativo — CPF/cartão cifrados (AES-256-GCM); CVV não armazenado', 'Cifrar dados sensíveis em repouso; nunca armazenar CVV'],
    ['9', 'FERRAMENTA', 'Varredura de vulnerabilidades do servidor (Nessus)', 'A preencher na aula conforme os achados do scan', 'Aplicar patches, fechar serviços e corrigir configurações apontadas'],
    ['10', 'FERRAMENTA', 'Mapeamento de portas/serviços expostos (nmap)', 'A preencher na aula (ex.: 80/443 abertas; 3306 fechada)', 'Fechar portas desnecessárias e restringir no firewall (ufw)'],
    ['11', 'MANUAL', 'Verificar cabeçalhos de segurança (HSTS, CSP, X-Frame-Options)', 'Negativo (sem falha) — cabeçalhos presentes via Helmet/nginx', 'Manter Helmet e cabeçalhos no proxy; revisar CSP periodicamente'],
    ['12', 'MANUAL', 'Mensagens de erro verbosas (stack/SQL ao cliente)', 'Negativo — erro genérico ao cliente; detalhe só no log', 'Desabilitar stack trace em produção; logar internamente'],
  ],
});

// ---------------------------------------------------------------------------
// 3) RECURSOS DE SEGURANÇA
// ---------------------------------------------------------------------------
const RECURSOS = doc({
  titulo: 'RECURSOS DE SEGURANÇA',
  subtitulo: 'Controles de segurança implementados e seus testes funcionais. "Resultado" conforme verificado neste sistema (modo seguro).',
  colunas: ['ID', 'Tipo', 'Recurso', 'Componente', 'Descrição', 'Testes funcional', 'Resultado', 'Sugestão de Correção (caso positivo)'],
  larguras: ['3%', '8%', '10%', '12%', '22%', '22%', '13%', '10%'],
  linhas: [
    ['1', 'Funcional', 'Senha', 'Tabela usuarios', 'Senha armazenada com hash bcrypt (custo 12) + salt', 'Verificar no banco se senha_hash está no formato $2b$...', 'OK — bcrypt', '—'],
    ['2', 'Funcional', 'Senha', 'Criação de senha', 'Mínimo de oito caracteres', 'Tentar cadastrar/trocar com menos de 8 caracteres', 'OK — recusado', 'Corrigir validação no processo'],
    ['3', 'Funcional', 'Senha', 'Criação de senha', 'Exigir número, letra maiúscula e símbolo', 'Cadastrar sem cada item; testar símbolos - , < > e espaço', 'OK — recusado', 'Corrigir validação no processo'],
    ['4', 'Funcional', 'CPF', 'Dados sensíveis', 'Cifrar CPF no banco (AES-256-GCM)', 'Ver no banco (ilegível) e decifrar na tela "Minha conta"', 'OK — cifrado', 'Cifrar nas rotinas que gravam'],
    ['5', 'Funcional', 'Cartão', 'Tabela pagamentos', 'Cifrar número do cartão; NÃO armazenar CVV', 'Ver cartao_cifrado ilegível; confirmar ausência de CVV', 'OK — cifrado / sem CVV', 'Cifrar PAN; remover CVV'],
    ['6', 'Funcional', 'Telefone', 'Dados sensíveis', 'Cifrar telefone no banco', 'Verificar telefone_cifrado ilegível no banco', 'OK — cifrado', 'Cifrar ao gravar'],
    ['7', 'Funcional', 'Sessão', 'Cookie de sessão', 'Cookie httpOnly, secure e SameSite; regenerar no login', 'Inspecionar o cookie "sid" no navegador (DevTools)', 'OK', 'Ajustar flags do cookie'],
    ['8', 'Funcional', 'CSRF', 'Formulários', 'Token anti-CSRF por sessão em cada formulário', 'Enviar POST sem o campo _csrf', 'OK — HTTP 403', 'Adicionar token aos forms'],
    ['9', 'Funcional', 'Controle de acesso', 'Pedidos', 'Verificar posse do pedido (anti-IDOR) e papéis (RBAC)', 'Acessar pedido de outro usuário; acessar /admin sem ser admin', 'OK — HTTP 403', 'Validar dono/papel no backend'],
    ['10', 'Funcional', 'Força bruta', 'Login', 'Rate limit (5/15min) + bloqueio de conta após 5 falhas', 'Errar a senha 6 vezes seguidas', 'OK — bloqueio/429', 'Rate limit + lockout'],
    ['11', 'Funcional', 'Cabeçalhos', 'HTTP (Helmet/nginx)', 'CSP, HSTS, X-Frame-Options, X-Content-Type-Options', 'Inspecionar cabeçalhos da resposta', 'OK — presentes', 'Habilitar Helmet/headers'],
    ['12', 'Funcional', 'Auditoria', 'logs_auditoria', 'Registrar login, falha, compra e acesso negado (IP/UA)', 'Consultar a tabela logs_auditoria após as ações', 'OK — registrando', 'Centralizar e monitorar logs'],
  ],
});

// ---------------------------------------------------------------------------
// 4) PENTEST EM SERVIDORES  (campos do formulário)
// ---------------------------------------------------------------------------
const linhasPentest = [[
  '1',
  'TutisTutis',
  'sha1$7c4a8d09ca3762af61e59520943dc26494f8941b  →  senha "123456" (quebrada no CrackStation)',
  'Quebra de hash SHA1 obtido da tabela usuarios (cenário com modo vulnerável ligado).',
  'VM alvo: 10.0.0.x  (preencher na aula)',
]];
for (let i = 2; i <= 12; i++) linhasPentest.push([String(i), '', '', '', '']);

const PENTEST = doc({
  titulo: 'PENTEST EM SERVIDORES',
  subtitulo: 'Registro dos ataques realizados durante a aula (mesmos campos do formulário https://forms.gle/A2gtAQvuctiVA7rL8). Preencha uma linha por ataque bem-sucedido e registre também no formulário.',
  colunas: ['ID', 'Nome de guerra', 'Hash', 'Descrição do ataque', 'Quais IPs'],
  larguras: ['3%', '14%', '33%', '35%', '15%'],
  linhas: linhasPentest,
});

// ---------------------------------------------------------------------------
async function main() {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const docs = [
    ['1-LINKS.pdf', LINKS],
    ['2-TESTES_DE_SEGURANCA.pdf', TESTES],
    ['3-RECURSOS_DE_SEGURANCA.pdf', RECURSOS],
    ['4-PENTEST_EM_SERVIDORES.pdf', PENTEST],
  ];
  for (const [nome, html] of docs) {
    await page.setContent(html, { waitUntil: 'load' });
    await page.pdf({
      path: path.join(OUT, nome),
      format: 'A4', landscape: true, printBackground: true,
      margin: { top: '12mm', bottom: '12mm', left: '12mm', right: '12mm' },
    });
    console.log('gerado: entrega/' + nome);
  }
  await browser.close();
}
main().catch((e) => { console.error(e); process.exit(1); });
