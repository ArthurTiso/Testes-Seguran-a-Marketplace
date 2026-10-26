'use strict';

/**
 * Regras de negócio de usuários: cadastro, autenticação, bloqueio por
 * tentativas, exposição de dados sensíveis (decifrados) apenas ao próprio
 * dono / admin.
 */
const { query } = require('../db/pool');
const {
  hashPassword, verifyPassword, encrypt, decrypt, fingerprint, maskCpf,
} = require('../utils/crypto');
const { validarForcaSenha, validarCpf, validarEmail, soDigitos } = require('../utils/validators');

const MAX_TENTATIVAS = 5;
const BLOQUEIO_MINUTOS = 15;

async function buscarPorEmail(email) {
  const rows = await query('SELECT * FROM usuarios WHERE email = ? LIMIT 1', [email]);
  return rows[0] || null;
}

async function buscarPorId(id) {
  const rows = await query('SELECT * FROM usuarios WHERE id = ? LIMIT 1', [id]);
  return rows[0] || null;
}

/** Cadastro com validação de senha, e-mail e CPF; dados sensíveis cifrados. */
async function cadastrar({ nome, email, senha, cpf, telefone }) {
  const erros = [];
  if (!nome || nome.trim().length < 3) erros.push('Nome inválido.');
  if (!validarEmail(email)) erros.push('E-mail inválido.');

  const forca = validarForcaSenha(senha);
  if (!forca.ok) erros.push(...forca.erros);

  const cpfDig = soDigitos(cpf);
  if (!validarCpf(cpfDig)) erros.push('CPF inválido.');

  if (erros.length) return { ok: false, erros };

  // Unicidade (e-mail e CPF) sem decifrar a base inteira.
  if (await buscarPorEmail(email)) return { ok: false, erros: ['E-mail já cadastrado.'] };
  const dup = await query('SELECT id FROM usuarios WHERE cpf_hash = ? LIMIT 1', [fingerprint(cpfDig)]);
  if (dup.length) return { ok: false, erros: ['CPF já cadastrado.'] };

  const senhaHash = await hashPassword(senha);
  const r = await query(
    `INSERT INTO usuarios (nome,email,senha_hash,cpf_cifrado,cpf_hash,telefone_cifrado,papel)
     VALUES (?,?,?,?,?,?, 'cliente')`,
    [nome.trim(), email.toLowerCase(), senhaHash, encrypt(cpfDig), fingerprint(cpfDig),
     encrypt(soDigitos(telefone))]
  );
  return { ok: true, id: r.insertId };
}

/**
 * Autenticação com controle de tentativas e bloqueio temporário de conta
 * (mitiga força bruta - OWASP A07). Retorna motivo em caso de falha.
 */
async function autenticar(email, senha) {
  const u = await buscarPorEmail(email);
  // Resposta uniforme p/ não revelar se o e-mail existe (user enumeration).
  if (!u) return { ok: false, motivo: 'credenciais' };

  if (u.bloqueado_ate && new Date(u.bloqueado_ate) > new Date()) {
    return { ok: false, motivo: 'bloqueado', ate: u.bloqueado_ate };
  }
  if (!u.ativo) return { ok: false, motivo: 'inativo' };

  const senhaOk = await verifyPassword(senha, u.senha_hash);
  if (!senhaOk) {
    const tentativas = u.tentativas_login + 1;
    if (tentativas >= MAX_TENTATIVAS) {
      await query(
        `UPDATE usuarios SET tentativas_login = ?,
           bloqueado_ate = DATE_ADD(NOW(), INTERVAL ? MINUTE) WHERE id = ?`,
        [tentativas, BLOQUEIO_MINUTOS, u.id]
      );
    } else {
      await query('UPDATE usuarios SET tentativas_login = ? WHERE id = ?', [tentativas, u.id]);
    }
    return { ok: false, motivo: 'credenciais', tentativas };
  }

  // Sucesso: zera contador.
  await query('UPDATE usuarios SET tentativas_login = 0, bloqueado_ate = NULL WHERE id = ?', [u.id]);
  return { ok: true, usuario: u };
}

/** Retorna os dados sensíveis decifrados (uso restrito ao dono/admin). */
function dadosSensiveis(u) {
  const cpf = decrypt(u.cpf_cifrado);
  return {
    cpf,
    cpfMascarado: maskCpf(cpf),
    telefone: decrypt(u.telefone_cifrado),
  };
}

module.exports = {
  buscarPorEmail,
  buscarPorId,
  cadastrar,
  autenticar,
  dadosSensiveis,
  MAX_TENTATIVAS,
  BLOQUEIO_MINUTOS,
};
