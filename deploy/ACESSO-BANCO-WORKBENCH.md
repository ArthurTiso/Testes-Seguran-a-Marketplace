# Acessar o banco via MySQL Workbench (avaliação do dia 26/10)

O MySQL/MariaDB da VM escuta por padrão só em `127.0.0.1` (boa prática:
não expor o banco na rede). Há duas formas de abrir no Workbench.

## Opção A — Túnel SSH (RECOMENDADA, segura)
No Workbench: **Database → Manage Connections → New**, aba *Connection*:

- Connection Method: **Standard TCP/IP over SSH**
- SSH Hostname: `IP_DA_VM:22`
- SSH Username: seu usuário Linux da VM
- SSH Password: (senha do usuário)
- MySQL Hostname: `127.0.0.1`
- MySQL Server Port: `3306`
- Username: `leitor`  (somente leitura) ou `marketplace`
- Password: a definida no `deploy/setup-db.sql` / `.env`

Assim o banco continua fechado para a rede e o acesso passa cifrado pelo SSH.

## Opção B — Acesso direto na LAN (mais simples, menos seguro)
Só use na rede isolada do laboratório.

1. Liberar o bind do MySQL:
   ```bash
   sudo sed -i 's/^bind-address.*/bind-address = 0.0.0.0/' \
     /etc/mysql/mariadb.conf.d/50-server.cnf
   sudo systemctl restart mariadb
   ```
2. Criar usuário acessível da rede (ajuste a sub-rede):
   ```sql
   CREATE USER 'leitor'@'%' IDENTIFIED BY 'LeitorSomenteLeitura!123';
   GRANT SELECT ON marketplace.* TO 'leitor'@'%';
   FLUSH PRIVILEGES;
   ```
3. Liberar a porta no firewall: `sudo ufw allow 3306/tcp`
4. No Workbench: **Standard TCP/IP**, Hostname = `IP_DA_VM`, Port `3306`,
   Username `leitor`.

## O que mostrar na avaliação
- Tabela `usuarios`: `senha_hash` em **bcrypt** (`$2b$...`) e `cpf_cifrado` ilegível.
- Tabela `pagamentos`: `cartao_cifrado` ilegível; só `ultimos4` em claro.
- Tabela `pedidos` / `pedido_itens` / `entregas`: a transação feita na aula.
- Tabela `logs_auditoria`: eventos de login e compra registrados.

Consultas úteis:
```sql
SELECT id,nome,email,LEFT(senha_hash,7) tipo_hash,LEFT(cpf_cifrado,20) cpf FROM usuarios;
SELECT pedido_id,LEFT(cartao_cifrado,25) cartao,ultimos4,bandeira FROM pagamentos;
SELECT * FROM logs_auditoria ORDER BY id DESC LIMIT 20;
```
