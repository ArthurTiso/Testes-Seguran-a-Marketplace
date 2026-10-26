'use strict';

/**
 * Funções de criptografia da aplicação.
 *
 * - Senhas:  bcrypt (hash + salt, lento de propósito) -> OWASP A02 / A07
 * - Dados sensíveis (CPF, telefone, cartão): AES-256-GCM em repouso -> OWASP A02
 *
 * O modo vulnerável pode trocar bcrypt por SHA1 (quebrável no CrackStation)
 * e pode desligar a cifragem dos dados sensíveis, para fins de teste.
 */
const crypto = require('crypto');
const bcrypt = require('bcrypt');
const config = require('../config');

// ---------------------------------------------------------------------------
// SENHAS
// ---------------------------------------------------------------------------

// Versão SEGURA: bcrypt
async function hashPasswordBcrypt(senha) {
  return bcrypt.hash(senha, config.secrets.bcryptRounds);
}

// Versão VULNERÁVEL: SHA1 sem salt (NUNCA usar em produção)
function hashPasswordSha1(senha) {
  return 'sha1$' + crypto.createHash('sha1').update(senha).digest('hex');
}

// Gera o hash conforme o modo configurado.
async function hashPassword(senha) {
  if (config.vuln.sha1Passwords) return hashPasswordSha1(senha);
  return hashPasswordBcrypt(senha);
}

// Verifica a senha, detectando o formato do hash armazenado.
async function verifyPassword(senha, hashArmazenado) {
  if (!hashArmazenado) return false;
  if (hashArmazenado.startsWith('sha1$')) {
    return hashArmazenado === hashPasswordSha1(senha);
  }
  // bcrypt (prefixos $2a$ / $2b$ / $2y$)
  try {
    return await bcrypt.compare(senha, hashArmazenado);
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// DADOS SENSÍVEIS - AES-256-GCM
// ---------------------------------------------------------------------------
const ALGO = 'aes-256-gcm';

function getKey() {
  const hex = config.secrets.dataKey;
  if (!hex || hex.length !== 64) {
    throw new Error('DATA_ENCRYPTION_KEY inválida (precisa de 64 hex). Rode: npm run gen:key');
  }
  return Buffer.from(hex, 'hex');
}

/**
 * Cifra um texto. Retorna string "iv:tag:ciphertext" (hex).
 * Se VULN_PLAINTEXT_SENSITIVE estiver ligado, retorna o texto em claro
 * com prefixo "plain:" para o teste de dado sensível não cifrado.
 */
function encrypt(texto) {
  if (texto === null || texto === undefined || texto === '') return null;
  if (config.vuln.plaintextSensitive) {
    return 'plain:' + String(texto);
  }
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGO, getKey(), iv);
  const enc = Buffer.concat([cipher.update(String(texto), 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv.toString('hex'), tag.toString('hex'), enc.toString('hex')].join(':');
}

/** Decifra string "iv:tag:ciphertext". Suporta registros "plain:" legados. */
function decrypt(blob) {
  if (blob === null || blob === undefined || blob === '') return null;
  if (String(blob).startsWith('plain:')) return String(blob).slice(6);
  try {
    const [ivHex, tagHex, dataHex] = String(blob).split(':');
    const decipher = crypto.createDecipheriv(ALGO, getKey(), Buffer.from(ivHex, 'hex'));
    decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
    const dec = Buffer.concat([decipher.update(Buffer.from(dataHex, 'hex')), decipher.final()]);
    return dec.toString('utf8');
  } catch {
    return '[dado ilegível]';
  }
}

/**
 * Fingerprint determinístico (HMAC-SHA256) usado para impor unicidade do CPF
 * e permitir busca sem precisar decifrar todos os registros. Usa a mesma
 * chave de dados como "pepper". Não é reversível.
 */
function fingerprint(texto) {
  if (!texto) return null;
  const key = config.secrets.dataKey || 'sem-chave';
  return crypto.createHmac('sha256', key).update(String(texto)).digest('hex');
}

/** Mascara CPF para exibição: 123.***.***-45 */
function maskCpf(cpf) {
  if (!cpf) return '';
  const d = cpf.replace(/\D/g, '');
  if (d.length !== 11) return '***';
  return `${d.slice(0, 3)}.***.***-${d.slice(9)}`;
}

/** Mostra só os 4 últimos dígitos do cartão. */
function last4(numero) {
  if (!numero) return '';
  const d = numero.replace(/\D/g, '');
  return d.slice(-4);
}

module.exports = {
  hashPassword,
  hashPasswordBcrypt,
  hashPasswordSha1,
  verifyPassword,
  encrypt,
  decrypt,
  fingerprint,
  maskCpf,
  last4,
};
