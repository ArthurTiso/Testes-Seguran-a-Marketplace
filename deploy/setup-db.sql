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

-- Privilégios restritos APENAS ao banco da aplicação (menor privilégio).
GRANT SELECT, INSERT, UPDATE, DELETE ON marketplace.* TO 'marketplace'@'localhost';

-- Usuário SOMENTE-LEITURA para abrir no Workbench durante a avaliação
-- (mostra os dados sem risco de alteração acidental).
CREATE USER IF NOT EXISTS 'leitor'@'localhost'
  IDENTIFIED BY 'LeitorSomenteLeitura!123';
GRANT SELECT ON marketplace.* TO 'leitor'@'localhost';

FLUSH PRIVILEGES;
