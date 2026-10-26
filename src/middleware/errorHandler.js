'use strict';

const config = require('../config');

// 404
function notFound(req, res) {
  res.status(404).render('erro', {
    titulo: 'Página não encontrada',
    mensagem: 'O recurso solicitado não existe.',
    status: 404,
  });
}

/**
 * Tratador de erros central.
 * Em modo seguro: mensagem genérica (não vaza stack/SQL) -> OWASP A05/A09.
 * Em VULN_VERBOSE_ERRORS: expõe a stack e detalhes (para o teste de
 * "mensagens de erro detalhadas / information disclosure").
 */
function errorHandler(err, req, res, next) { // eslint-disable-line no-unused-vars
  const status = err.status || 500;
  if (status >= 500) console.error('[erro]', err);

  const expor = config.vuln.verboseErrors;
  res.status(status).render('erro', {
    titulo: status === 403 ? 'Acesso negado' : 'Erro',
    mensagem: expor
      ? `${err.message}\n\n${err.stack || ''}`
      : (status < 500 ? err.message : 'Ocorreu um erro interno. Tente novamente.'),
    status,
  });
}

module.exports = { notFound, errorHandler };
