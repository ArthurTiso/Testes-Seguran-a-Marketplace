'use strict';

/**
 * Controle de autenticação e autorização (OWASP A01 - Broken Access Control).
 */

// Exige usuário autenticado.
function requireAuth(req, res, next) {
  if (req.session && req.session.userId) return next();
  return res.redirect('/login?next=' + encodeURIComponent(req.originalUrl));
}

// Exige um papel específico (ex.: 'admin', 'vendedor').
function requireRole(...papeis) {
  return (req, res, next) => {
    if (!req.session || !req.session.userId) {
      return res.redirect('/login');
    }
    if (!papeis.includes(req.session.papel)) {
      return res.status(403).render('erro', {
        titulo: 'Acesso negado',
        mensagem: 'Você não tem permissão para acessar este recurso.',
        status: 403,
      });
    }
    return next();
  };
}

// Disponibiliza dados do usuário logado para as views.
function exposeUser(req, res, next) {
  res.locals.usuario = req.session && req.session.userId
    ? { id: req.session.userId, nome: req.session.nome, papel: req.session.papel }
    : null;
  next();
}

module.exports = { requireAuth, requireRole, exposeUser };
