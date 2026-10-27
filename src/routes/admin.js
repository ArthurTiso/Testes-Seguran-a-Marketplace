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

/**
 * Visualizador do banco de dados (somente leitura), acessível pelo site.
 * Permite ao avaliador conferir as tabelas e os dados reais (hashes bcrypt,
 * CPF/cartão cifrados) sem precisar de Workbench/pgAdmin.
 *
 * Segurança: restrito ao papel 'admin' e com WHITELIST de tabelas — o nome
 * da tabela nunca vem direto do usuário para a query (evita SQL Injection).
 */
const TABELAS = [
  'usuarios', 'enderecos', 'produtos', 'avaliacoes', 'pedidos',
  'pedido_itens', 'pagamentos', 'entregas', 'logs_auditoria',
];

router.get('/admin/banco', requireRole('admin'), async (req, res, next) => {
  try {
    const tabela = TABELAS.includes(req.query.t) ? req.query.t : 'usuarios';

    // Contagem de registros por tabela (para o menu lateral).
    const contagens = {};
    for (const t of TABELAS) {
      const r = await query(`SELECT COUNT(*) AS n FROM \`${t}\``);
      contagens[t] = r[0].n;
    }

    // Dados da tabela selecionada (limite de 200 linhas).
    const linhas = await query(`SELECT * FROM \`${tabela}\` ORDER BY 1 DESC LIMIT 200`);
    const colunas = linhas.length ? Object.keys(linhas[0]) : [];

    res.render('banco', { TABELAS, tabela, contagens, colunas, linhas });
  } catch (e) { next(e); }
});

module.exports = router;
