-- ==========================================================================
--  Executar como root do MySQL/MariaDB na VM:
--     sudo mysql < deploy/setup-db.sql
--  Cria o banco e o usuário da aplicação com privilégios mínimos.
--  TROQUE a senha abaixo e reflita no .env (DB_PASSWORD).
-- ==========================================================================

CREATE DATABASE IF NOT EXISTS marketplace
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Usuário da aplicação (acesso só a partir do localhost).
CREATE USER IF NOT EXISTS 'marketplace'@'localhost'
  IDENTIFIED BY 'TroqueEstaSenhaForte!123';

-- Privilégios restritos APENAS ao banco "marketplace" (menor privilégio:
-- o usuário não enxerga nem toca em nenhum outro banco do servidor).
-- Inclui DDL (CREATE/DROP/ALTER) porque os scripts npm run db:init / db:seed
-- criam e recriam as tabelas com este usuário.
-- Obs.: em produção real, o ideal é separar um usuário "migrador" (com DDL)
-- do usuário de runtime (só SELECT/INSERT/UPDATE/DELETE).
GRANT ALL PRIVILEGES ON marketplace.* TO 'marketplace'@'localhost';

-- Usuário SOMENTE-LEITURA para abrir no Workbench durante a avaliação
-- (mostra os dados sem risco de alteração acidental).
CREATE USER IF NOT EXISTS 'leitor'@'localhost'
  IDENTIFIED BY 'LeitorSomenteLeitura!123';
GRANT SELECT ON marketplace.* TO 'leitor'@'localhost';

FLUSH PRIVILEGES;
