'use strict';

/**
 * Gera de 1 a 3 produtos fake por execução (para o "banco vivo" e o teste
 * de scripts que exige criação periódica de produtos). Os nomes usam
 * categorias conhecidas para casarem com as imagens do catálogo.
 *   node scripts/gerar-produtos.js        # 1 a 3 produtos
 *   node scripts/gerar-produtos.js 1      # exatamente 1
 */
const { query, pool } = require('../src/db/pool');

const rnd = (n) => Math.floor(Math.random() * n);

const BASES = [
  { n: 'Teclado', ex: ['Mecânico RGB', 'sem fio', 'Gamer', 'ABNT2', 'compacto'] },
  { n: 'Mouse', ex: ['Gamer 7200 DPI', 'sem fio', 'ergonômico', 'óptico'] },
  { n: 'Monitor', ex: ['24" Full HD', '27" 144Hz', 'IPS', 'curvo'] },
  { n: 'Headset', ex: ['USB 7.1', 'com microfone', 'bluetooth', 'gamer'] },
  { n: 'Webcam', ex: ['1080p', 'Full HD', 'com microfone'] },
  { n: 'SSD', ex: ['240GB', '480GB', '1TB NVMe', 'SATA III'] },
];

async function main() {
  const arg = parseInt(process.argv[2], 10);
  const quantidade = Number.isInteger(arg) ? arg : 1 + rnd(3); // 1 a 3

  // Vendedor para associar os produtos (vendedor/admin; senão qualquer um).
  let vend = await query("SELECT id FROM usuarios WHERE papel IN ('vendedor','admin') ORDER BY id LIMIT 1");
  if (!vend.length) vend = await query('SELECT id FROM usuarios ORDER BY id LIMIT 1');
  if (!vend.length) { console.log('sem usuários para ser vendedor'); await pool.end(); return; }
  const vendedorId = vend[0].id;

  let criados = 0;
  for (let i = 0; i < quantidade; i++) {
    const b = BASES[rnd(BASES.length)];
    const nome = `${b.n} ${b.ex[rnd(b.ex.length)]}`;
    const preco = (49 + rnd(1200)) + 0.90;
    const estoque = 5 + rnd(60);
    await query(
      `INSERT INTO produtos (vendedor_id,nome,descricao,preco,estoque)
       VALUES (?,?,?,?,?)`,
      [vendedorId, nome, 'Produto gerado automaticamente (demonstração).', preco, estoque]
    );
    criados++;
  }

  const [tot] = await query('SELECT COUNT(*) AS n FROM produtos');
  console.log(`[${new Date().toISOString()}] +${criados} produtos (total agora: ${tot.n})`);
  await pool.end();
}

main().catch(async (e) => {
  console.error('Falha ao gerar produtos:', e.message);
  try { await pool.end(); } catch {}
  process.exit(1);
});
