'use strict';

/**
 * ****************  CÓDIGO PROPOSITALMENTE VULNERÁVEL  ****************
 *
 * Este arquivo existe APENAS para os testes de invasão autorizados da
 * disciplina. Ele é ativado por flags do .env (VULN_SQL_INJECTION) e NÃO é
 * usado quando o sistema está em modo seguro.
 *
 * Demonstra SQL Injection por concatenação de string (OWASP A03:2021).
 * Correção = usar queries parametrizadas (ver src/services/*).
 */
const { unsafeRawQuery } = require('../db/pool');

/**
 * Login vulnerável: concatena e-mail/senha direto na query.
 * Payload clássico de bypass:  email = ' OR '1'='1' --
 */
async function loginSqlInjectable(email, senha) {
  const sql =
    `SELECT * FROM usuarios WHERE email = '${email}' AND senha_hash = '${senha}' LIMIT 1`;
  const rows = await unsafeRawQuery(sql);
  return { sqlExecutado: sql, usuario: rows[0] || null };
}

/**
 * Busca de produtos vulnerável: permite UNION SELECT para extrair dados.
 * Ex.: ' UNION SELECT 1,email,cpf_cifrado,senha_hash,5,6,7,8 FROM usuarios --
 */
async function buscaSqlInjectable(termo) {
  const sql =
    `SELECT id, nome, descricao, preco, estoque, vendedor_id, ativo, criado_em
     FROM produtos WHERE ativo = 1 AND nome LIKE '%${termo}%'`;
  const rows = await unsafeRawQuery(sql);
  return { sqlExecutado: sql, rows };
}

module.exports = { loginSqlInjectable, buscaSqlInjectable };
