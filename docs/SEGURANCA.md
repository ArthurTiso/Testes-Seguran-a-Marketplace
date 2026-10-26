# Controles de segurança — mapeamento OWASP → código

Referência dos controles implementados e onde encontrá-los no código.

## A01 — Broken Access Control
- Autenticação por sessão: `src/middleware/auth.js` (`requireAuth`).
- Autorização por papel (RBAC): `requireRole('admin'|'vendedor')`.
- Anti-IDOR: `orderService.obterPedido()` confere `comprador_id` antes de exibir
  (`src/services/orderService.js`); acesso indevido → HTTP 403 + log.

## A02 — Cryptographic Failures
- Senhas com **bcrypt** (custo 12): `src/utils/crypto.js` (`hashPassword`).
- Dados sensíveis com **AES-256-GCM** em repouso (CPF, telefone, cartão):
  `encrypt()/decrypt()` em `src/utils/crypto.js`.
- CPF com `fingerprint()` (HMAC-SHA256) para unicidade sem decifrar.
- Cartão: só os 4 últimos dígitos em claro; **CVV nunca é armazenado**
  (`src/services/orderService.js`).
- TLS/HTTPS no nginx (`deploy/nginx-marketplace.conf`).

## A03 — Injection
- **SQL Injection:** todas as queries usam placeholders `?`
  (`pool.execute`) — `src/db/pool.js`, `src/services/*`.
- **XSS:** escape de saída (`src/utils/sanitize.js`) e views com `<%= %>`;
  CSP via Helmet.

## A04 — Insecure Design
- Separação clara entre caminho seguro e caminho vulnerável (`src/vuln/`),
  este último só ativável por flag explícita.
- Transação de banco no checkout (atômica, com `FOR UPDATE` no estoque).

## A05 — Security Misconfiguration
- **Helmet**: CSP, HSTS, X-Frame-Options, X-Content-Type-Options
  (`src/middleware/security.js`).
- Erros genéricos ao cliente; detalhes só no log (`src/middleware/errorHandler.js`).
- Usuário do banco com **privilégios mínimos** (`deploy/setup-db.sql`).
- Serviço systemd endurecido (`NoNewPrivileges`, `ProtectSystem`).

## A06 — Vulnerable Components
- Dependências fixadas no `package.json`; usar `npm audit` periodicamente.

## A07 — Identification & Authentication Failures
- Política de senha (mín. 8, maiúscula, número, símbolo): `src/utils/validators.js`.
- **Rate limit** no login (5/15min) + **bloqueio de conta** após 5 falhas:
  `src/middleware/security.js` e `src/services/userService.js`.
- Resposta uniforme de login (não revela se o e-mail existe).
- Regeneração de sessão no login (anti session fixation).
- Cookie de sessão `httpOnly` + `secure` + `sameSite=lax`.

## A08 — Software & Data Integrity
- CSRF: token sincronizado por sessão em todos os formulários
  (`csrfProtection` em `src/middleware/security.js`).

## A09 — Security Logging & Monitoring
- Tabela `logs_auditoria` com IP/user-agent: `src/middleware/audit.js`.
- Eventos: `LOGIN_OK`, `LOGIN_FALHA`, `CADASTRO`, `COMPRA`, `ACESSO_NEGADO`.

## A10 — SSRF
- A aplicação não faz requisições a URLs fornecidas pelo usuário (sem superfície
  de SSRF neste escopo).
