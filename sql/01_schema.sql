-- ==========================================================================
--  Marketplace - Segurança de Sistemas (IFSP)
--  Schema do banco de dados MySQL / MariaDB
--
--  Decisões de segurança:
--   - Senhas: coluna senha_hash (bcrypt por padrão).
--   - Dados sensíveis cifrados em repouso (AES-256-GCM): cpf_cifrado,
--     telefone_cifrado, cartao_cifrado.
--   - cpf_hash (HMAC-SHA256) impõe unicidade sem precisar decifrar.
--   - CVV do cartão NUNCA é armazenado (boa prática PCI-DSS).
--   - logs_auditoria registra eventos de segurança (OWASP A09).
-- ==========================================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS logs_auditoria;
DROP TABLE IF EXISTS entregas;
DROP TABLE IF EXISTS pagamentos;
DROP TABLE IF EXISTS pedido_itens;
DROP TABLE IF EXISTS pedidos;
DROP TABLE IF EXISTS avaliacoes;
DROP TABLE IF EXISTS produtos;
DROP TABLE IF EXISTS enderecos;
DROP TABLE IF EXISTS usuarios;

SET FOREIGN_KEY_CHECKS = 1;

-- --------------------------------------------------------------------------
CREATE TABLE usuarios (
  id               INT AUTO_INCREMENT PRIMARY KEY,
  nome             VARCHAR(120)  NOT NULL,
  email            VARCHAR(160)  NOT NULL,
  senha_hash       VARCHAR(255)  NOT NULL,
  cpf_cifrado      VARCHAR(255)  NOT NULL,
  cpf_hash         CHAR(64)      NOT NULL,              -- HMAC p/ unicidade
  telefone_cifrado VARCHAR(255),
  papel            ENUM('cliente','vendedor','admin') NOT NULL DEFAULT 'cliente',
  ativo            TINYINT(1)    NOT NULL DEFAULT 1,
  tentativas_login INT           NOT NULL DEFAULT 0,
  bloqueado_ate    DATETIME      NULL,
  criado_em        TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_usuarios_email (email),
  UNIQUE KEY uq_usuarios_cpf   (cpf_hash)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- --------------------------------------------------------------------------
CREATE TABLE enderecos (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  usuario_id    INT NOT NULL,
  destinatario  VARCHAR(120) NOT NULL,
  cep           VARCHAR(9)   NOT NULL,
  logradouro    VARCHAR(160) NOT NULL,
  numero        VARCHAR(20)  NOT NULL,
  complemento   VARCHAR(80),
  bairro        VARCHAR(80)  NOT NULL,
  cidade        VARCHAR(80)  NOT NULL,
  uf            CHAR(2)      NOT NULL,
  criado_em     TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_end_usuario FOREIGN KEY (usuario_id)
    REFERENCES usuarios(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- --------------------------------------------------------------------------
CREATE TABLE produtos (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  vendedor_id INT NOT NULL,
  nome        VARCHAR(160)  NOT NULL,
  descricao   TEXT,
  preco       DECIMAL(10,2) NOT NULL,
  estoque     INT           NOT NULL DEFAULT 0,
  ativo       TINYINT(1)    NOT NULL DEFAULT 1,
  criado_em   TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_prod_vendedor FOREIGN KEY (vendedor_id)
    REFERENCES usuarios(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- --------------------------------------------------------------------------
CREATE TABLE avaliacoes (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  produto_id  INT NOT NULL,
  usuario_id  INT NOT NULL,
  nota        TINYINT NOT NULL,
  comentario  TEXT,
  criado_em   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_av_produto FOREIGN KEY (produto_id)
    REFERENCES produtos(id) ON DELETE CASCADE,
  CONSTRAINT fk_av_usuario FOREIGN KEY (usuario_id)
    REFERENCES usuarios(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- --------------------------------------------------------------------------
CREATE TABLE pedidos (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  comprador_id INT NOT NULL,
  endereco_id  INT NOT NULL,
  status       ENUM('pendente','pago','enviado','entregue','cancelado')
               NOT NULL DEFAULT 'pendente',
  total        DECIMAL(10,2) NOT NULL,
  criado_em    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_ped_comprador FOREIGN KEY (comprador_id)
    REFERENCES usuarios(id),
  CONSTRAINT fk_ped_endereco FOREIGN KEY (endereco_id)
    REFERENCES enderecos(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- --------------------------------------------------------------------------
CREATE TABLE pedido_itens (
  id             INT AUTO_INCREMENT PRIMARY KEY,
  pedido_id      INT NOT NULL,
  produto_id     INT NOT NULL,
  quantidade     INT NOT NULL,
  preco_unitario DECIMAL(10,2) NOT NULL,
  CONSTRAINT fk_item_pedido FOREIGN KEY (pedido_id)
    REFERENCES pedidos(id) ON DELETE CASCADE,
  CONSTRAINT fk_item_produto FOREIGN KEY (produto_id)
    REFERENCES produtos(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- --------------------------------------------------------------------------
CREATE TABLE pagamentos (
  id             INT AUTO_INCREMENT PRIMARY KEY,
  pedido_id      INT NOT NULL,
  cartao_cifrado VARCHAR(255) NOT NULL,       -- PAN cifrado (AES-256-GCM)
  titular        VARCHAR(120) NOT NULL,
  ultimos4       CHAR(4)      NOT NULL,
  bandeira       VARCHAR(20),
  validade       VARCHAR(7),                  -- MM/AAAA (CVV nunca é salvo)
  status         ENUM('autorizado','recusado') NOT NULL DEFAULT 'autorizado',
  criado_em      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_pag_pedido FOREIGN KEY (pedido_id)
    REFERENCES pedidos(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- --------------------------------------------------------------------------
CREATE TABLE entregas (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  pedido_id       INT NOT NULL,
  transportadora  VARCHAR(80),
  codigo_rastreio VARCHAR(40),
  status          ENUM('preparando','em_transito','entregue')
                  NOT NULL DEFAULT 'preparando',
  previsao        DATE,
  CONSTRAINT fk_entrega_pedido FOREIGN KEY (pedido_id)
    REFERENCES pedidos(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- --------------------------------------------------------------------------
CREATE TABLE logs_auditoria (
  id         BIGINT AUTO_INCREMENT PRIMARY KEY,
  usuario_id INT NULL,
  acao       VARCHAR(80)  NOT NULL,
  detalhe    VARCHAR(500),
  ip         VARCHAR(64),
  user_agent VARCHAR(255),
  criado_em  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  KEY idx_log_usuario (usuario_id),
  KEY idx_log_acao (acao)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
