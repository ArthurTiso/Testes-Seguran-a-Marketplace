'use strict';

/**
 * Gera compras (transações) fake periodicamente, para deixar o banco "vivo".
 * Reutiliza o fluxo seguro de checkout (orderService.finalizarCompra): cria
 * pedido + itens + baixa de estoque + pagamento (cartão cifrado) + entrega,
 * tudo dentro de uma transação atômica.
 *
 *   node scripts/gerar-compras.js        # faz um lote (3 a 10 compras)
 *   node scripts/gerar-compras.js 5      # faz exatamente 5 compras
 *
 * Todos os dados são fictícios (cartão = número de teste padrão Visa).
 */
const { query, pool } = require('../src/db/pool');
const orderService = require('../src/services/orderService');

const rnd = (n) => Math.floor(Math.random() * n);

const RUAS = ['Rua das Palmeiras', 'Av. Brasil', 'Rua XV de Novembro',
  'Rua do Sol', 'Av. dos Trabalhadores', 'Rua das Acácias'];

async function enderecoDoCliente(clienteId) {
  const existentes = await query(
    'SELECT id FROM enderecos WHERE usuario_id = ? LIMIT 1', [clienteId]
  );
  if (existentes.length) return existentes[0].id;
  // cria um endereço fictício para o cliente
  return orderService.criarEndereco(clienteId, {
    destinatario: 'Cliente ' + clienteId,
    cep: '11660-000',
    logradouro: RUAS[rnd(RUAS.length)],
    numero: String(10 + rnd(990)),
    complemento: null,
    bairro: 'Centro',
    cidade: 'Caraguatatuba',
    uf: 'SP',
  });
}

async function main() {
  const arg = parseInt(process.argv[2], 10);
  const quantidade = Number.isInteger(arg) ? arg : 3 + rnd(8); // 3 a 10

  const clientes = await query("SELECT id FROM usuarios WHERE papel = 'cliente'");
  const produtos = await query('SELECT id FROM produtos WHERE ativo = 1 AND estoque > 0');
  if (!clientes.length || !produtos.length) {
    console.log(`[${new Date().toISOString()}] sem clientes/produtos com estoque — nenhuma compra gerada`);
    await pool.end();
    return;
  }

  let feitas = 0;
  for (let i = 0; i < quantidade; i++) {
    const clienteId = clientes[rnd(clientes.length)].id;
    try {
      const enderecoId = await enderecoDoCliente(clienteId);
      // carrinho com 1 a 3 produtos distintos
      const qtdItens = 1 + rnd(3);
      const escolhidos = new Set();
      const carrinho = [];
      for (let j = 0; j < qtdItens; j++) {
        const p = produtos[rnd(produtos.length)].id;
        if (escolhidos.has(p)) continue;
        escolhidos.add(p);
        carrinho.push({ produtoId: p, quantidade: 1 + rnd(2) });
      }
      await orderService.finalizarCompra({
        compradorId: clienteId,
        enderecoId,
        carrinho,
        pagamento: { numero: '4111111111111111', titular: 'CLIENTE TESTE', validade: '12/2030' },
      });
      feitas++;
    } catch (e) {
      // estoque insuficiente ou outra condição — apenas pula esta compra
    }
  }

  const [tot] = await query('SELECT COUNT(*) AS n FROM pedidos');
  console.log(`[${new Date().toISOString()}] +${feitas} compras (total de pedidos: ${tot.n})`);
  await pool.end();
}

main().catch(async (e) => {
  console.error('Falha ao gerar compras:', e.message);
  try { await pool.end(); } catch {}
  process.exit(1);
});
