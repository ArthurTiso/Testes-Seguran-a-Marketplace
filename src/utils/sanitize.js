'use strict';

const config = require('../config');

/**
 * Escapa HTML para prevenir XSS (OWASP A03).
 * No modo vulnerável (VULN_XSS) devolve o texto cru, permitindo
 * demonstrar Cross-Site Scripting armazenado nas avaliações/produtos.
 *
 * Observação: nas views EJS, usar sempre <%= valor %> (escape automático).
 * O uso de <%- %> (sem escape) fica restrito ao caminho vulnerável.
 */
function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  if (config.vuln.xss) return String(str); // VULNERÁVEL: sem escape
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

module.exports = { escapeHtml };
