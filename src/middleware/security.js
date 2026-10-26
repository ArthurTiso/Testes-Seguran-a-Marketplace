'use strict';

/**
 * Middlewares de segurança de borda:
 *  - Helmet: cabeçalhos HTTP seguros (CSP, HSTS, X-Frame-Options, etc.)
 *  - Rate limit: mitiga força bruta e abuso (OWASP A07)
 *  - CSRF: token sincronizado por sessão (OWASP A01 / CSRF)
 */
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const crypto = require('crypto');
const config = require('../config');

// ---- Cabeçalhos seguros ----
function securityHeaders() {
  return helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"], // CSS inline simples das views
        imgSrc: ["'self'", 'data:'],
        objectSrc: ["'none'"],
        frameAncestors: ["'none'"],
        baseUri: ["'self'"],
        formAction: ["'self'"],
      },
    },
    hsts: { maxAge: 15552000, includeSubDomains: true }, // 180 dias
    referrerPolicy: { policy: 'same-origin' },
  });
}

// ---- Rate limit geral ----
const generalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => config.vuln.noRateLimit, // desligável para teste de força bruta
});

// ---- Rate limit do login (mais restrito) ----
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5, // 5 tentativas por 15 min por IP
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => config.vuln.noRateLimit,
  message: 'Muitas tentativas de login. Tente novamente em alguns minutos.',
});

// ---- CSRF (synchronizer token pattern) ----
function csrfProtection(req, res, next) {
  if (!req.session) return next();
  if (!req.session.csrfToken) {
    req.session.csrfToken = crypto.randomBytes(24).toString('hex');
  }
  // Disponibiliza o token para as views
  res.locals.csrfToken = req.session.csrfToken;

  const metodosSeguros = ['GET', 'HEAD', 'OPTIONS'];
  if (metodosSeguros.includes(req.method)) return next();

  const enviado = (req.body && req.body._csrf) || req.get('x-csrf-token');
  if (!enviado || enviado !== req.session.csrfToken) {
    const err = new Error('Token CSRF inválido ou ausente.');
    err.status = 403;
    return next(err);
  }
  return next();
}

module.exports = {
  securityHeaders,
  generalLimiter,
  loginLimiter,
  csrfProtection,
};
