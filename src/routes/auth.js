'use strict';

const express = require('express');
const router = express.Router();
const config = require('../config');
const userService = require('../services/userService');
const { registrarAuditoria } = require('../middleware/audit');
const { loginLimiter } = require('../middleware/security');
const { loginSqlInjectable } = require('../vuln/sqli');

// ---------- Cadastro ----------
router.get('/cadastro', (req, res) => {
  res.render('cadastro', { erros: [], valores: {} });
});

router.post('/cadastro', async (req, res, next) => {
  try {
    const { nome, email, senha, cpf, telefone } = req.body;
    const r = await userService.cadastrar({ nome, email, senha, cpf, telefone });
    if (!r.ok) {
      return res.status(400).render('cadastro', { erros: r.erros, valores: req.body });
    }
    await registrarAuditoria(req, 'CADASTRO', `novo usuário id=${r.id}`, r.id);
    res.render('mensagem', {
      titulo: 'Cadastro realizado',
      mensagem: 'Conta criada com sucesso! Você já pode fazer login.',
      link: '/login', linkTexto: 'Ir para o login',
    });
  } catch (e) { next(e); }
});

// ---------- Login ----------
router.get('/login', (req, res) => {
  res.render('login', { erro: null, next: req.query.next || '/' });
});

router.post('/login', loginLimiter, async (req, res, next) => {
  try {
    const { email, senha } = req.body;
    const destino = req.body.next || '/';

    // ---- Caminho VULNERÁVEL (SQL Injection), só com a flag ligada ----
    if (config.vuln.sqlInjection) {
      const { usuario, sqlExecutado } = await loginSqlInjectable(email, senha);
      console.log('[VULN-SQLi login] ', sqlExecutado);
      if (usuario) {
        req.session.userId = usuario.id;
        req.session.nome = usuario.nome;
        req.session.papel = usuario.papel;
        await registrarAuditoria(req, 'LOGIN_VULN_SQLI', `email=${email}`, usuario.id);
        return res.redirect(destino);
      }
      return res.status(401).render('login', { erro: 'Credenciais inválidas.', next: destino });
    }

    // ---- Caminho SEGURO ----
    const r = await userService.autenticar((email || '').toLowerCase(), senha);
    if (!r.ok) {
      let msg = 'E-mail ou senha incorretos.';
      if (r.motivo === 'bloqueado') msg = 'Conta temporariamente bloqueada por excesso de tentativas. Aguarde alguns minutos.';
      if (r.motivo === 'inativo') msg = 'Conta inativa.';
      await registrarAuditoria(req, 'LOGIN_FALHA', `email=${email} motivo=${r.motivo}`);
      return res.status(401).render('login', { erro: msg, next: destino });
    }
    // Regenera a sessão (evita session fixation).
    req.session.regenerate((err) => {
      if (err) return next(err);
      req.session.userId = r.usuario.id;
      req.session.nome = r.usuario.nome;
      req.session.papel = r.usuario.papel;
      registrarAuditoria(req, 'LOGIN_OK', `email=${email}`, r.usuario.id);
      res.redirect(destino);
    });
  } catch (e) { next(e); }
});

// ---------- Logout ----------
router.post('/logout', (req, res) => {
  const uid = req.session.userId;
  req.session.destroy(() => {
    res.clearCookie('sid');
    res.redirect('/login');
  });
  if (uid) console.log(`[logout] usuário ${uid}`);
});

module.exports = router;
