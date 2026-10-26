'use strict';

const { query } = require('../db/pool');

async function listar({ busca } = {}) {
  if (busca) {
    // SEGURO: parametrizado (LIKE com placeholder).
    return query(
      `SELECT p.*, u.nome AS vendedor FROM produtos p
       JOIN usuarios u ON u.id = p.vendedor_id
       WHERE p.ativo = 1 AND (p.nome LIKE ? OR p.descricao LIKE ?)
       ORDER BY p.nome`,
      [`%${busca}%`, `%${busca}%`]
    );
  }
  return query(
    `SELECT p.*, u.nome AS vendedor FROM produtos p
     JOIN usuarios u ON u.id = p.vendedor_id
     WHERE p.ativo = 1 ORDER BY p.nome`
  );
}

async function obter(id) {
  const rows = await query(
    `SELECT p.*, u.nome AS vendedor FROM produtos p
     JOIN usuarios u ON u.id = p.vendedor_id
     WHERE p.id = ? LIMIT 1`, [id]
  );
  return rows[0] || null;
}

async function avaliacoesDoProduto(produtoId) {
  return query(
    `SELECT a.*, u.nome AS autor FROM avaliacoes a
     JOIN usuarios u ON u.id = a.usuario_id
     WHERE a.produto_id = ? ORDER BY a.criado_em DESC`,
    [produtoId]
  );
}

async function adicionarAvaliacao(produtoId, usuarioId, nota, comentario) {
  const n = Math.max(1, Math.min(5, parseInt(nota, 10) || 0));
  await query(
    `INSERT INTO avaliacoes (produto_id,usuario_id,nota,comentario) VALUES (?,?,?,?)`,
    [produtoId, usuarioId, n, (comentario || '').slice(0, 1000)]
  );
}

async function criar(vendedorId, { nome, descricao, preco, estoque }) {
  const r = await query(
    `INSERT INTO produtos (vendedor_id,nome,descricao,preco,estoque) VALUES (?,?,?,?,?)`,
    [vendedorId, nome, descricao, parseFloat(preco) || 0, parseInt(estoque, 10) || 0]
  );
  return r.insertId;
}

module.exports = { listar, obter, avaliacoesDoProduto, adicionarAvaliacao, criar };
