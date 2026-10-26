'use strict';

const express = require('express');
const router = express.Router();
const config = require('../config');
const productService = require('../services/productService');
const { requireAuth } = require('../middleware/auth');
const { buscaSqlInjectable } = require('../vuln/sqli');

// Catálogo + busca
router.get('/', async (req, res, next) => {
  try {
    const busca = req.query.q || '';
    let produtos;
    let debugSql = null;

    if (busca && config.vuln.sqlInjection) {
      // Caminho VULNERÁVEL de busca (SQLi / UNION)
      const r = await buscaSqlInjectable(busca);
      produtos = r.rows.map((x) => ({
        id: x.id, nome: x.nome, descricao: x.descricao,
        preco: x.preco, estoque: x.estoque, vendedor: '—',
      }));
      debugSql = config.vuln.verboseErrors ? r.sqlExecutado : null;
    } else {
      produtos = await productService.listar({ busca });
    }
    res.render('catalogo', { produtos, busca, debugSql });
  } catch (e) { next(e); }
});

// Detalhe do produto + avaliações
router.get('/produto/:id', async (req, res, next) => {
  try {
    const produto = await productService.obter(req.params.id);
    if (!produto) {
      return res.status(404).render('erro', { titulo: 'Produto', mensagem: 'Produto não encontrado.', status: 404 });
    }
    const avaliacoes = await productService.avaliacoesDoProduto(produto.id);
    res.render('produto', { produto, avaliacoes });
  } catch (e) { next(e); }
});

// Nova avaliação (campo usado para demonstrar XSS armazenado)
router.post('/produto/:id/avaliar', requireAuth, async (req, res, next) => {
  try {
    await productService.adicionarAvaliacao(
      req.params.id, req.session.userId, req.body.nota, req.body.comentario
    );
    res.redirect('/produto/' + req.params.id);
  } catch (e) { next(e); }
});

module.exports = router;
