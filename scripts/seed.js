'use strict';

/**
 * Popula o banco com dados FAKE (fictícios), incluindo os dados sensíveis
 * exigidos pela atividade: nomes, CPFs, endereços, telefones e cartões.
 *
 * - Senhas: gravadas com hash (bcrypt, ou SHA1 se VULN_SHA1_PASSWORDS=true).
 * - CPF / telefone / cartão: cifrados (AES-256-GCM) antes de inserir.
 * - Cria um pedido de exemplo (transação) com pagamento e entrega.
 *
 * IMPORTANTE: todos os CPFs e cartões aqui são FICTÍCIOS (cartões = números
 * de teste padrão das bandeiras). Nunca use dados reais de terceiros.
 */
const { query, pool } = require('../src/db/pool');
const { hashPassword, encrypt, fingerprint, last4 } = require('../src/utils/crypto');

// Gera um CPF válido (dígitos verificadores corretos) a partir de 9 dígitos base.
function gerarCpf(base9) {
  const d = base9.split('').map(Number);
  let s = 0;
  for (let i = 0; i < 9; i++) s += d[i] * (10 - i);
  let r = (s * 10) % 11; if (r === 10) r = 0;
  d.push(r);
  s = 0;
  for (let i = 0; i < 10; i++) s += d[i] * (11 - i);
  r = (s * 10) % 11; if (r === 10) r = 0;
  d.push(r);
  return d.join('');
}

const USUARIOS = [
  { nome: 'Administrador', email: 'admin@marketplace.local', senha: 'Admin@2026',
    cpf: gerarCpf('111222333'), tel: '12999990000', papel: 'admin' },
  { nome: 'Loja do João (Vendedor)', email: 'vendedor@loja.com', senha: 'Vendedor@1',
    cpf: gerarCpf('222333444'), tel: '12988887777', papel: 'vendedor' },
  { nome: 'Maria Souza', email: 'maria@email.com', senha: 'Cliente@123',
    cpf: gerarCpf('333444555'), tel: '12977776666', papel: 'cliente' },
  { nome: 'Carlos Pereira', email: 'carlos@email.com', senha: 'Cliente@456',
    cpf: gerarCpf('444555666'), tel: '12966665555', papel: 'cliente' },
];

const PRODUTOS = [
  { nome: 'Teclado Mecânico RGB', descricao: 'Switch azul, ABNT2.', preco: 289.90, estoque: 25 },
  { nome: 'Mouse Gamer 7200 DPI', descricao: 'Sensor óptico, 6 botões.', preco: 149.90, estoque: 40 },
  { nome: 'Monitor 24" Full HD', descricao: 'IPS, 75Hz, HDMI.', preco: 899.00, estoque: 12 },
  { nome: 'Headset USB com microfone', descricao: 'Som surround 7.1.', preco: 199.90, estoque: 30 },
  { nome: 'Webcam 1080p', descricao: 'Foco automático, microfone embutido.', preco: 179.90, estoque: 18 },
  { nome: 'SSD 1TB NVMe', descricao: 'Leitura 3500MB/s.', preco: 429.90, estoque: 22 },
];

async function limpar() {
  for (const t of ['logs_auditoria','entregas','pagamentos','pedido_itens',
                    'pedidos','avaliacoes','produtos','enderecos','usuarios']) {
    await query(`DELETE FROM ${t}`);
    await query(`ALTER TABLE ${t} AUTO_INCREMENT = 1`);
  }
}

async function main() {
  console.log('> Limpando dados antigos...');
  await limpar();

  console.log('> Inserindo usuários (senhas com hash, CPF/telefone cifrados)...');
  const ids = {};
  for (const u of USUARIOS) {
    const senhaHash = await hashPassword(u.senha);
    const r = await query(
      `INSERT INTO usuarios (nome,email,senha_hash,cpf_cifrado,cpf_hash,telefone_cifrado,papel)
       VALUES (?,?,?,?,?,?,?)`,
      [u.nome, u.email, senhaHash, encrypt(u.cpf), fingerprint(u.cpf),
       encrypt(u.tel), u.papel]
    );
    ids[u.email] = r.insertId;
  }

  const vendedorId = ids['vendedor@loja.com'];
  const mariaId = ids['maria@email.com'];

  console.log('> Inserindo produtos...');
  const prodIds = [];
  for (const p of PRODUTOS) {
    const r = await query(
      `INSERT INTO produtos (vendedor_id,nome,descricao,preco,estoque)
       VALUES (?,?,?,?,?)`,
      [vendedorId, p.nome, p.descricao, p.preco, p.estoque]
    );
    prodIds.push(r.insertId);
  }

  console.log('> Inserindo endereço da Maria...');
  const endRes = await query(
    `INSERT INTO enderecos (usuario_id,destinatario,cep,logradouro,numero,complemento,bairro,cidade,uf)
     VALUES (?,?,?,?,?,?,?,?,?)`,
    [mariaId, 'Maria Souza', '11660-000', 'Rua das Flores', '123', 'Apto 45',
     'Centro', 'Caraguatatuba', 'SP']
  );
  const enderecoId = endRes.insertId;

  console.log('> Criando pedido de exemplo (transação) + pagamento + entrega...');
  const item1 = { produto: prodIds[0], qtd: 1, preco: PRODUTOS[0].preco };
  const item2 = { produto: prodIds[1], qtd: 2, preco: PRODUTOS[1].preco };
  const total = item1.preco * item1.qtd + item2.preco * item2.qtd;

  const pedRes = await query(
    `INSERT INTO pedidos (comprador_id,endereco_id,status,total) VALUES (?,?, 'pago', ?)`,
    [mariaId, enderecoId, total]
  );
  const pedidoId = pedRes.insertId;

  for (const it of [item1, item2]) {
    await query(
      `INSERT INTO pedido_itens (pedido_id,produto_id,quantidade,preco_unitario)
       VALUES (?,?,?,?)`,
      [pedidoId, it.produto, it.qtd, it.preco]
    );
  }

  // Cartão de teste FICTÍCIO (número de teste padrão Visa). CVV nunca é salvo.
  const pan = '4111111111111111';
  await query(
    `INSERT INTO pagamentos (pedido_id,cartao_cifrado,titular,ultimos4,bandeira,validade,status)
     VALUES (?,?,?,?,?,?, 'autorizado')`,
    [pedidoId, encrypt(pan), 'MARIA SOUZA', last4(pan), 'Visa', '12/2030']
  );

  await query(
    `INSERT INTO entregas (pedido_id,transportadora,codigo_rastreio,status,previsao)
     VALUES (?,?,?, 'em_transito', DATE_ADD(CURDATE(), INTERVAL 5 DAY))`,
    [pedidoId, 'Correios', 'BR123456789SP']
  );

  console.log('> Inserindo avaliações...');
  await query(
    `INSERT INTO avaliacoes (produto_id,usuario_id,nota,comentario) VALUES (?,?,?,?)`,
    [prodIds[0], mariaId, 5, 'Excelente teclado, recomendo!']
  );

  console.log('\n===================  SEED CONCLUÍDO  ===================');
  console.log('Usuários criados (login / senha):');
  for (const u of USUARIOS) console.log(`  - ${u.email}  /  ${u.senha}   [${u.papel}]`);
  console.log(`\nPedido de exemplo #${pedidoId} (status: pago) para maria@email.com`);
  console.log('========================================================\n');

  await pool.end();
}

main().catch(async (e) => {
  console.error('Falha no seed:', e);
  try { await pool.end(); } catch {}
  process.exit(1);
});
