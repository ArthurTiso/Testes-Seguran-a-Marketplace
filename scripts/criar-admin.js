'use strict';

/**
 * Cria (ou atualiza) um usuário ADMIN.
 * Padrão: nelson.alves@ifsp.edu.br (solicitado na avaliação).
 *   node scripts/criar-admin.js
 *   node scripts/criar-admin.js email@dominio.com SenhaForte@1 "Nome Completo"
 *
 * Senha é gravada com bcrypt; CPF/telefone cifrados (AES-256-GCM).
 */
const { query, pool } = require('../src/db/pool');
const { hashPassword, encrypt, fingerprint } = require('../src/utils/crypto');

function gerarCpfValido() {
  const d = Array.from({ length: 9 }, () => Math.floor(Math.random() * 10));
  let s = 0; for (let i = 0; i < 9; i++) s += d[i] * (10 - i);
  let r = (s * 10) % 11; if (r === 10) r = 0; d.push(r);
  s = 0; for (let i = 0; i < 10; i++) s += d[i] * (11 - i);
  r = (s * 10) % 11; if (r === 10) r = 0; d.push(r);
  return d.join('');
}

async function main() {
  const email = (process.argv[2] || 'nelson.alves@ifsp.edu.br').toLowerCase();
  const senha = process.argv[3] || 'IFsp100%';
  const nome = process.argv[4] || 'Nelson Alves';

  const hash = await hashPassword(senha);
  const existe = await query('SELECT id FROM usuarios WHERE email = ? LIMIT 1', [email]);

  if (existe.length) {
    await query(
      `UPDATE usuarios SET senha_hash = ?, papel = 'admin', ativo = 1,
         tentativas_login = 0, bloqueado_ate = NULL WHERE email = ?`,
      [hash, email]
    );
    console.log(`Admin ATUALIZADO: ${email} (senha redefinida, papel=admin)`);
  } else {
    const cpf = gerarCpfValido();
    await query(
      `INSERT INTO usuarios (nome,email,senha_hash,cpf_cifrado,cpf_hash,telefone_cifrado,papel)
       VALUES (?,?,?,?,?,?, 'admin')`,
      [nome, email, hash, encrypt(cpf), fingerprint(cpf), encrypt('12999990000')]
    );
    console.log(`Admin CRIADO: ${email}  (senha: ${senha})`);
  }
  await pool.end();
}

main().catch(async (e) => {
  console.error('Falha ao criar admin:', e.message);
  try { await pool.end(); } catch {}
  process.exit(1);
});
