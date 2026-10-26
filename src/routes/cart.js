'use strict';

/**
 * Carrinho em sessão. Estrutura: req.session.carrinho = { [produtoId]: qtd }
 */
const express = require('express');
const router = express.Router();
const productService = require('../services/productService');

function getCarrinho(req) {
  if (!req.session.carrinho) req.session.carrinho = {};
  return req.session.carrinho;
}

router.post('/carrinho/adicionar', async (req, res, next) => {
  try {
    const id = parseInt(req.body.produtoId, 10);
    const qtd = Math.max(1, parseInt(req.body.quantidade, 10) || 1);
    const prod = await productService.obter(id);
    if (!prod) return res.status(404).send('Produto inexistente');
    const c = getCarrinho(req);
    c[id] = (c[id] || 0) + qtd;
    res.redirect('/carrinho');
  } catch (e) { next(e); }
});

router.post('/carrinho/remover', (req, res) => {
  const c = getCarrinho(req);
  delete c[parseInt(req.body.produtoId, 10)];
  res.redirect('/carrinho');
});

router.get('/carrinho', async (req, res, next) => {
  try {
    const c = getCarrinho(req);
    const itens = [];
    let total = 0;
    for (const [id, qtd] of Object.entries(c)) {
      const prod = await productService.obter(id);
      if (prod) {
        const subtotal = Number(prod.preco) * qtd;
        total += subtotal;
        itens.push({ produto: prod, qtd, subtotal });
      }
    }
    res.render('carrinho', { itens, total });
  } catch (e) { next(e); }
});

module.exports = router;
