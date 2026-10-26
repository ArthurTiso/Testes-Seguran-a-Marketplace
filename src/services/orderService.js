'use strict';

/**
 * Regras de pedidos/checkout. A finalização usa TRANSAÇÃO do banco
 * (atômica): cria pedido, itens, baixa de estoque, pagamento e entrega.
 */
const { pool, query } = require('../db/pool');
const { encrypt, last4 } = require('../utils/crypto');

function bandeiraPorNumero(pan) {
  const d = pan.replace(/\D/g, '');
  if (/^4/.test(d)) return 'Visa';
  if (/^5[1-5]/.test(d)) return 'Mastercard';
  if (/^3[47]/.test(d)) return 'Amex';
  if (/^6/.test(d)) return 'Elo/Discover';
  return 'Outro';
}

async function listarEnderecos(usuarioId) {
  return query('SELECT * FROM enderecos WHERE usuario_id = ? ORDER BY id DESC', [usuarioId]);
}

async function criarEndereco(usuarioId, e) {
  const r = await query(
    `INSERT INTO enderecos (usuario_id,destinatario,cep,logradouro,numero,complemento,bairro,cidade,uf)
     VALUES (?,?,?,?,?,?,?,?,?)`,
    [usuarioId, e.destinatario, e.cep, e.logradouro, e.numero, e.complemento || null,
     e.bairro, e.cidade, (e.uf || '').toUpperCase().slice(0, 2)]
  );
  return r.insertId;
}

/**
 * Finaliza a compra dentro de uma transação.
 * carrinho: [{ produtoId, quantidade }]
 * pagamento: { numero, titular, validade }  (CVV é recebido mas NÃO salvo)
 */
async function finalizarCompra({ compradorId, enderecoId, carrinho, pagamento }) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // Valida posse do endereço (evita usar endereço de outro usuário).
    const [end] = await conn.execute(
      'SELECT id FROM enderecos WHERE id = ? AND usuario_id = ?',
      [enderecoId, compradorId]
    );
    if (!end.length) throw new Error('Endereço inválido para este usuário.');

    // Carrega produtos e confere estoque.
    let total = 0;
    const itens = [];
    for (const item of carrinho) {
      const [rows] = await conn.execute(
        'SELECT id, preco, estoque FROM produtos WHERE id = ? AND ativo = 1 FOR UPDATE',
        [item.produtoId]
      );
      const p = rows[0];
      if (!p) throw new Error('Produto indisponível.');
      const qtd = Math.max(1, parseInt(item.quantidade, 10) || 1);
      if (p.estoque < qtd) throw new Error(`Estoque insuficiente para o produto ${p.id}.`);
      total += Number(p.preco) * qtd;
      itens.push({ produtoId: p.id, qtd, preco: Number(p.preco) });
    }
    if (!itens.length) throw new Error('Carrinho vazio.');

    // Cria o pedido.
    const [ped] = await conn.execute(
      `INSERT INTO pedidos (comprador_id,endereco_id,status,total) VALUES (?,?, 'pago', ?)`,
      [compradorId, enderecoId, total.toFixed(2)]
    );
    const pedidoId = ped.insertId;

    for (const it of itens) {
      await conn.execute(
        `INSERT INTO pedido_itens (pedido_id,produto_id,quantidade,preco_unitario) VALUES (?,?,?,?)`,
        [pedidoId, it.produtoId, it.qtd, it.preco]
      );
      await conn.execute(
        'UPDATE produtos SET estoque = estoque - ? WHERE id = ?',
        [it.qtd, it.produtoId]
      );
    }

    // Pagamento: PAN cifrado; CVV descartado; só últimos 4 em claro.
    const pan = (pagamento.numero || '').replace(/\D/g, '');
    await conn.execute(
      `INSERT INTO pagamentos (pedido_id,cartao_cifrado,titular,ultimos4,bandeira,validade,status)
       VALUES (?,?,?,?,?,?, 'autorizado')`,
      [pedidoId, encrypt(pan), (pagamento.titular || '').toUpperCase(),
       last4(pan), bandeiraPorNumero(pan), pagamento.validade || null]
    );

    // Entrega.
    const rastreio = 'BR' + Date.now().toString().slice(-9) + 'SP';
    await conn.execute(
      `INSERT INTO entregas (pedido_id,transportadora,codigo_rastreio,status,previsao)
       VALUES (?, 'Correios', ?, 'preparando', DATE_ADD(CURDATE(), INTERVAL 7 DAY))`,
      [pedidoId, rastreio]
    );

    await conn.commit();
    return { ok: true, pedidoId, total };
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
}

async function listarPedidosDoUsuario(usuarioId) {
  return query(
    `SELECT p.*, e.status AS entrega_status, e.codigo_rastreio
     FROM pedidos p LEFT JOIN entregas e ON e.pedido_id = p.id
     WHERE p.comprador_id = ? ORDER BY p.id DESC`,
    [usuarioId]
  );
}

/**
 * Detalhe do pedido. Em modo seguro, exige que o pedido pertença ao usuário
 * (ou admin). O caminho IDOR vulnerável fica isolado em src/vuln.
 */
async function obterPedido(pedidoId, usuarioId, isAdmin = false) {
  const rows = await query('SELECT * FROM pedidos WHERE id = ? LIMIT 1', [pedidoId]);
  const pedido = rows[0];
  if (!pedido) return null;
  if (!isAdmin && pedido.comprador_id !== usuarioId) return { negado: true };

  const itens = await query(
    `SELECT i.*, pr.nome FROM pedido_itens i
     JOIN produtos pr ON pr.id = i.produto_id WHERE i.pedido_id = ?`, [pedidoId]
  );
  const [endereco] = await query('SELECT * FROM enderecos WHERE id = ?', [pedido.endereco_id]);
  const [pagamento] = await query(
    'SELECT titular, ultimos4, bandeira, validade, status FROM pagamentos WHERE pedido_id = ?',
    [pedidoId]
  );
  const [entrega] = await query('SELECT * FROM entregas WHERE pedido_id = ?', [pedidoId]);
  return { pedido, itens, endereco, pagamento, entrega };
}

module.exports = {
  listarEnderecos,
  criarEndereco,
  finalizarCompra,
  listarPedidosDoUsuario,
  obterPedido,
};
