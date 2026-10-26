'use strict';

const express = require('express');
const router = express.Router();
const config = require('../config');
const orderService = require('../services/orderService');
const { requireAuth } = require('../middleware/auth');
const { registrarAuditoria } = require('../middleware/audit');

// Tela de checkout (endereços + pagamento)
router.get('/checkout', requireAuth, async (req, res, next) => {
  try {
    const carrinho = req.session.carrinho || {};
    if (!Object.keys(carrinho).length) return res.redirect('/carrinho');
    const enderecos = await orderService.listarEnderecos(req.session.userId);
    res.render('checkout', { enderecos, erro: null });
  } catch (e) { next(e); }
});

// Cadastro rápido de endereço
router.post('/enderecos', requireAuth, async (req, res, next) => {
  try {
    await orderService.criarEndereco(req.session.userId, req.body);
    res.redirect('/checkout');
  } catch (e) { next(e); }
});

// Finalização da compra (TRANSAÇÃO)
router.post('/checkout', requireAuth, async (req, res, next) => {
  try {
    const carrinho = req.session.carrinho || {};
    const itens = Object.entries(carrinho).map(([produtoId, quantidade]) => ({ produtoId, quantidade }));
    if (!itens.length) return res.redirect('/carrinho');

    const r = await orderService.finalizarCompra({
      compradorId: req.session.userId,
      enderecoId: parseInt(req.body.enderecoId, 10),
      carrinho: itens,
      pagamento: {
        numero: req.body.cartaoNumero,
        titular: req.body.cartaoTitular,
        validade: req.body.cartaoValidade,
        // CVV é recebido mas intencionalmente NÃO persistido (PCI-DSS).
      },
    });

    req.session.carrinho = {};
    await registrarAuditoria(req, 'COMPRA', `pedido=${r.pedidoId} total=${r.total.toFixed(2)}`);
    res.redirect('/pedidos/' + r.pedidoId);
  } catch (e) {
    const enderecos = await orderService.listarEnderecos(req.session.userId);
    res.status(400).render('checkout', { enderecos, erro: e.message });
  }
});

// Lista de pedidos do usuário
router.get('/pedidos', requireAuth, async (req, res, next) => {
  try {
    const pedidos = await orderService.listarPedidosDoUsuario(req.session.userId);
    res.render('pedidos', { pedidos });
  } catch (e) { next(e); }
});

// Detalhe do pedido (controle de acesso / ponto de teste IDOR)
router.get('/pedidos/:id', requireAuth, async (req, res, next) => {
  try {
    const isAdmin = req.session.papel === 'admin';

    // VULNERÁVEL (IDOR): ignora o dono do pedido quando a flag está ligada.
    const dono = config.vuln.idor ? req.session.userId : req.session.userId;
    const forcarAcesso = config.vuln.idor; // em modo vuln, admin-like p/ qualquer pedido

    const data = await orderService.obterPedido(
      req.params.id, dono, isAdmin || forcarAcesso
    );
    if (!data) {
      return res.status(404).render('erro', { titulo: 'Pedido', mensagem: 'Pedido não encontrado.', status: 404 });
    }
    if (data.negado) {
      await registrarAuditoria(req, 'ACESSO_NEGADO', `pedido=${req.params.id}`);
      return res.status(403).render('erro', { titulo: 'Acesso negado', mensagem: 'Este pedido não pertence à sua conta.', status: 403 });
    }
    res.render('pedido_detalhe', { ...data });
  } catch (e) { next(e); }
});

module.exports = router;
