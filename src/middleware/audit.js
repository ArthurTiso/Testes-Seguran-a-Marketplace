'use strict';

/**
 * Registro de auditoria/segurança (OWASP A09 - Security Logging & Monitoring).
 * Grava eventos relevantes (login, falha de login, pedido, acesso negado)
 * na tabela logs_auditoria, com IP e user-agent.
 */
const { query } = require('../db/pool');

async function registrarAuditoria(req, acao, detalhe = null, usuarioId = null) {
  try {
    const ip = (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '')
      .toString().split(',')[0].trim();
    const ua = (req.get('user-agent') || '').slice(0, 255);
    const uid = usuarioId || (req.session && req.session.userId) || null;
    await query(
      `INSERT INTO logs_auditoria (usuario_id, acao, detalhe, ip, user_agent)
       VALUES (?, ?, ?, ?, ?)`,
      [uid, acao, detalhe ? String(detalhe).slice(0, 500) : null, ip, ua]
    );
  } catch (e) {
    // Nunca deixar a auditoria quebrar a requisição.
    console.error('[auditoria] falha ao registrar:', e.message);
  }
}

module.exports = { registrarAuditoria };
