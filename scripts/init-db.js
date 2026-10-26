'use strict';

/**
 * Cria/recria o schema no banco configurado no .env.
 * O banco e o usuário da aplicação devem existir (criados pelo
 * deploy/setup-db.sql, executado como root). Este script só aplica o schema.
 */
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const config = require('../src/config');

async function main() {
  const sql = fs.readFileSync(path.join(__dirname, '..', 'sql', '01_schema.sql'), 'utf8');
  const conn = await mysql.createConnection({
    host: config.db.host,
    port: config.db.port,
    user: config.db.user,
    password: config.db.password,
    database: config.db.database,
    multipleStatements: true,
  });
  console.log(`> Aplicando schema em ${config.db.database}@${config.db.host} ...`);
  await conn.query(sql);
  await conn.end();
  console.log('> Schema aplicado com sucesso.');
}

main().catch((e) => {
  console.error('Falha ao aplicar schema:', e.message);
  process.exit(1);
});
