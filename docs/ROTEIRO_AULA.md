# Roteiro da avaliação prática — 26/10

Checklist para a demonstração em aula. Tenha o sistema em **modo seguro**
(todas as flags `VULN_*` em `false`) para a parte 1.

## Antes da aula (na VM)
1. `sudo bash deploy/instalar-vm.sh IP_DA_VM`
2. Confirmar o serviço: `sudo systemctl status marketplace`
3. Abrir o site: `https://IP_DA_VM` (aceitar o certificado autoassinado)
4. Deixar o MySQL Workbench configurado (ver `deploy/ACESSO-BANCO-WORKBENCH.md`)

## Parte 1 — Demonstração do sistema
### a) Criar um usuário
- Acessar **Cadastrar** → preencher nome, e-mail, CPF, telefone e senha forte.
- Mostrar que a senha fraca é **recusada** (política de senha).

### b) Fazer uma transação
- Entrar com o usuário criado, adicionar produtos ao **carrinho**.
- **Finalizar compra**: cadastrar endereço de entrega + cartão → pedido "pago".
- Mostrar a tela do pedido (itens, entrega com rastreio, cartão mascarado).

### c) Acessar o banco (Workbench)
- Conectar e mostrar:
  - `usuarios`: `senha_hash` em **bcrypt**, `cpf_cifrado` **ilegível**.
  - `pagamentos`: `cartao_cifrado` **ilegível**, só `ultimos4` em claro.
  - `pedidos`/`pedido_itens`/`entregas`: a compra recém-feita.
  - `logs_auditoria`: eventos de login e compra.

## Parte 2 — Testes de invasão (modo vulnerável)
Para cada ataque: ligar a flag no `.env`, `sudo systemctl restart marketplace`,
reproduzir, **registrar no formulário e na planilha**, e voltar a flag p/ `false`.

Ordem sugerida (ver `docs/PENTEST.md`):
1. SQL Injection (bypass de login) — `VULN_SQL_INJECTION`
2. Senhas SHA1 + CrackStation — `VULN_SHA1_PASSWORDS`
3. IDOR (acesso a pedido alheio) — `VULN_IDOR`
4. XSS armazenado — `VULN_XSS`
5. Força bruta — `VULN_NO_RATE_LIMIT`

## Registro da entrega
- **Formulário de ataques:** https://forms.gle/A2gtAQvuctiVA7rL8
  (campos: Nome de guerra, Hash, Descrição do ataque, Quais IPs)
- **Planilhas (4 PDFs):** pasta `entrega/`
  - `1-LINKS.pdf`
  - `2-TESTES_DE_SEGURANCA.pdf`
  - `3-RECURSOS_DE_SEGURANCA.pdf`
  - `4-PENTEST_EM_SERVIDORES.pdf`

## Teste automatizado (opcional, para conferência)
```bash
# Com o servidor rodando em modo seguro:
node tests/pentest.js            # valida que SQLi/IDOR estão bloqueados
```
