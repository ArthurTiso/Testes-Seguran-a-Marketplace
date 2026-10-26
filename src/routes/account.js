'use strict';

const express = require('express');
const router = express.Router();
const userService = require('../services/userService');
const productService = require('../services/productService');
const { requireAuth, requireRole } = require('../middleware/auth');

// Perfil: mostra dados sensíveis do PRÓPRIO usuário (decifrados), CPF mascarado.
router.get('/conta', requireAuth, async (req, res, next) => {
  try {
    const u = await userService.buscarPorId(req.session.userId);
    const sens = userService.dadosSensiveis(u);
    res.render('conta', { u, sens });
  } catch (e) { next(e); }
});

// Área do vendedor: cadastrar produto
router.get('/vendedor/produtos/novo', requireRole('vendedor', 'admin'), (req, res) => {
  res.render('produto_novo', { erro: null });
});

router.post('/vendedor/produtos', requireRole('vendedor', 'admin'), async (req, res, next) => {
  try {
    const { nome, descricao, preco, estoque } = req.body;
    if (!nome || !preco) {
      return res.status(400).render('produto_novo', { erro: 'Nome e preço são obrigatórios.' });
    }
    const id = await productService.criar(req.session.userId, { nome, descricao, preco, estoque });
    res.redirect('/produto/' + id);
  } catch (e) { next(e); }
});

module.exports = router;
