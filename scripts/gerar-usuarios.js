'use strict';

/**
 * Gera entre 5 e 30 usuários FAKE por execução, respeitando a segurança do
 * sistema (senha em bcrypt, CPF/telefone cifrados em AES-256-GCM).
 * Pensado para rodar periodicamente (ver scripts/popular-continuo.sh) e deixar
 * o banco "vivo" durante a demonstração.
 *
 *   node scripts/gerar-usuarios.js        # adiciona um lote (5 a 30)
 *   node scripts/gerar-usuarios.js 10     # adiciona exatamente 10
 *
 * Todos os dados são fictícios.
 */
const { query, pool } = require('../src/db/pool');
const { hashPassword, encrypt, fingerprint } = require('../src/utils/crypto');

const NOMES = ['Ana', 'Bruno', 'Carla', 'Diego', 'Elaine', 'Felipe', 'Gabriela',
  'Henrique', 'Isabela', 'Joao', 'Karina', 'Lucas', 'Mariana', 'Nicolas',
  'Olivia', 'Paulo', 'Queila', 'Rafael', 'Sofia', 'Thiago', 'Vitor', 'Yara'];
const SOBRENOMES = ['Silva', 'Souza', 'Oliveira', 'Santos', 'Pereira', 'Costa',
  'Almeida', 'Lima', 'Gomes', 'Ribeiro', 'Carvalho', 'Araujo', 'Fernandes',
  'Rocha', 'Martins', 'Barbosa', 'Teixeira', 'Moreira'];

const rnd = (n) => Math.floor(Math.random() * n);

// Gera um CPF válido (dígitos verificadores corretos) a partir de base aleatória.
function gerarCpfValido() {
  const d = Array.from({ length: 9 }, () => rnd(10));
  let s = 0;
  for (let i = 0; i < 9; i++) s += d[i] * (10 - i);
  let r = (s * 10) % 11; if (r === 10) r = 0; d.push(r);
  s = 0;
  for (let i = 0; i < 10; i++) s += d[i] * (11 - i);
  r = (s * 10) % 11; if (r === 10) r = 0; d.push(r);
  return d.join('');
}

function gerarTelefone() {
  return '12' + String(9) + Array.from({ length: 8 }, () => rnd(10)).join('');
}

async function inserirUsuario() {
  const nome = `${NOMES[rnd(NOMES.length)]} ${SOBRENOMES[rnd(SOBRENOMES.length)]}`;
  const sufixo = Date.now().toString(36).slice(-4) + rnd(1000);
  const email = nome.toLowerCase().replace(/\s+/g, '.') + sufixo + '@exemplo.com';
  const cpf = gerarCpfValido();
  const senha = 'Senha@' + (100 + rnd(900)); // forte: maiúscula, símbolo e número
  const senhaHash = await hashPassword(senha);
  try {
    await query(
      `INSERT INTO usuarios (nome,email,senha_hash,cpf_cifrado,cpf_hash,telefone_cifrado,papel)
       VALUES (?,?,?,?,?,?, 'cliente')`,
      [nome, email, senhaHash, encrypt(cpf), fingerprint(cpf), encrypt(gerarTelefone())]
    );
    return true;
  } catch (e) {
    // Ignora colisão rara de e-mail/CPF (chaves únicas).
    if (e.code === 'ER_DUP_ENTRY') return false;
    throw e;
  }
}

async function main() {
  const arg = parseInt(process.argv[2], 10);
  const quantidade = Number.isInteger(arg) ? arg : 5 + rnd(26); // 5 a 30
  let inseridos = 0;
  for (let i = 0; i < quantidade; i++) {
    if (await inserirUsuario()) inseridos++;
  }
  const [tot] = await query('SELECT COUNT(*) AS n FROM usuarios');
  console.log(`[${new Date().toISOString()}] +${inseridos} usuários (total agora: ${tot.n})`);
  await pool.end();
}

main().catch(async (e) => {
  console.error('Falha ao gerar usuários:', e.message);
  try { await pool.end(); } catch {}
  process.exit(1);
});
