# Marketplace — Segurança de Sistemas (IFSP Caraguatatuba)

Marketplace didático (compra e venda de produtos com entrega) construído para a
atividade da disciplina de **Segurança de Sistemas**. Implementa boas práticas
**OWASP** e possui um **modo vulnerável isolável** (por flags no `.env`) para os
testes de invasão autorizados.

> Todos os dados sensíveis (nomes, CPFs, endereços, telefones, cartões) são
> **fictícios**. Cartões usam números de teste padrão das bandeiras.

## Stack
- **Node.js + Express** (views EJS)
- **MySQL / MariaDB** (acesso via MySQL Workbench)
- **nginx** (proxy reverso + HTTPS) e **systemd** na VM

## Funcionalidades
- Cadastro e login de usuários (cliente / vendedor / admin)
- Catálogo, busca, carrinho e **checkout com entrega** (transação atômica)
- Pagamento com cartão (número cifrado; CVV nunca armazenado)
- Área do vendedor (cadastro de produtos) e painel admin (usuários + auditoria)

## Recursos de segurança (OWASP)
| Tema | Implementação |
|------|---------------|
| Senhas (A02/A07) | **bcrypt** (hash + salt, custo 12) |
| Política de senha | mín. 8, maiúscula, número e símbolo |
| Dados sensíveis (A02) | **AES-256-GCM** em repouso (CPF, telefone, cartão) |
| SQL Injection (A03) | **queries parametrizadas** (prepared statements) |
| XSS (A03) | escape de saída nas views |
| Controle de acesso (A01) | sessão + RBAC + verificação de posse (anti-IDOR) |
| CSRF | token sincronizado por sessão |
| Força bruta (A07) | rate limit + bloqueio de conta após 5 tentativas |
| Cabeçalhos (A05) | Helmet (CSP, HSTS, X-Frame-Options...) |
| Sessão | cookie httpOnly + secure + sameSite; regeneração no login |
| Auditoria (A09) | tabela `logs_auditoria` (login, compra, acesso negado) |
| TLS | HTTPS via nginx |

## Rodando localmente (desenvolvimento)
```bash
npm install
cp .env.example .env
npm run gen:key           # copie as chaves para o .env
# ajuste NODE_ENV=development e os dados do banco no .env
sudo mysql < deploy/setup-db.sql
npm run db:reset          # schema + dados de exemplo
npm start                 # http://localhost:3000
```

## Instalando na VM (produção)
```bash
sudo cp -r . /opt/marketplace && cd /opt/marketplace
sudo bash deploy/instalar-vm.sh IP_DA_VM
```
Veja `deploy/ACESSO-BANCO-WORKBENCH.md` para abrir o banco no Workbench.

## Usuários de exemplo (após `npm run db:seed`)
| E-mail | Senha | Papel |
|--------|-------|-------|
| admin@marketplace.local | `Admin@2026` | admin |
| vendedor@loja.com | `Vendedor@1` | vendedor |
| maria@email.com | `Cliente@123` | cliente |
| carlos@email.com | `Cliente@456` | cliente |

## Documentos
- `docs/SEGURANCA.md` — detalhamento dos controles de segurança
- `docs/ROTEIRO_AULA.md` — passo a passo da avaliação (26/10)
- `docs/PENTEST.md` — como ligar o modo vulnerável e reproduzir cada ataque
- `entrega/` — os 4 PDFs das planilhas de teste

## ⚠ Modo vulnerável
As flags `VULN_*` do `.env` ativam falhas **propositais e isoladas** para os
testes autorizados (SQLi, XSS, SHA1, IDOR, etc.). Na entrega padrão, mantenha
**todas em `false`** (sistema seguro). Detalhes em `docs/PENTEST.md`.
