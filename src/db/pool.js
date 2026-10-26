'use strict';

/**
 * Pool de conexões MySQL (mysql2/promise).
 *
 * SEGURANÇA: use SEMPRE pool.execute(sql, params) com placeholders "?".
 * Isso envia o comando e os dados separadamente (prepared statements),
 * neutralizando SQL Injection (OWASP A03:2021 - Injection).
 *
 * Nunca concatene entrada do usuário diretamente na query. O único lugar
 * onde isso acontece é em src/vuln/* , de forma proposital e isolada,
 * para os testes de invasão.
 */
const mysql = require('mysql2/promise');
const config = require('../config');

const pool = mysql.createPool({
  host: config.db.host,
  port: config.db.port,
  user: config.db.user,
  password: config.db.password,
  database: config.db.database,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  namedPlaceholders: true,
  // Em produção real, habilite TLS entre app e banco:
  // ssl: { rejectUnauthorized: true, ca: fs.readFileSync('ca.pem') },
});

// Query segura (parametrizada) - helper padrão da aplicação.
async function query(sql, params = []) {
  const [rows] = await pool.execute(sql, params);
  return rows;
}

// Query "crua" - usada SOMENTE pelos módulos de modo vulnerável.
// Permite demonstrar SQL Injection. NÃO use no código seguro.
async function unsafeRawQuery(sql) {
  const [rows] = await pool.query(sql);
  return rows;
}

module.exports = { pool, query, unsafeRawQuery };
