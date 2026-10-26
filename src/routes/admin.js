'use strict';

const express = require('express');
const router = express.Router();
const { query } = require('../db/pool');
const { requireRole } = require('../middleware/auth');
const { maskCpf, decrypt } = require('../utils/crypto');

// Painel admin: usuários (CPF mascarado) e últimos logs de auditoria.
router.get('/admin', requireRole('admin'), async (req, res, next) => {
  try {
    const usuarios = await query(
      'SELECT id,nome,email,papel,ativo,tentativas_login,bloqueado_ate,criado_em FROM usuarios ORDER BY id'
    );
    // Decifra só para mascarar (admin não vê CPF completo na tela).
    const linhas = [];
    for (const u of usuarios) {
      const full = await query('SELECT cpf_cifrado FROM usuarios WHERE id = ?', [u.id]);
      linhas.push({ ...u, cpf: maskCpf(decrypt(full[0].cpf_cifrado)) });
    }
    const logs = await query('SELECT * FROM logs_auditoria ORDER BY id DESC LIMIT 50');
    res.render('admin', { usuarios: linhas, logs });
  } catch (e) { next(e); }
});

module.exports = router;
