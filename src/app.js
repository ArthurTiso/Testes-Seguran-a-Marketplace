'use strict';

const path = require('path');
const express = require('express');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const morgan = require('morgan');

const config = require('./config');
const { securityHeaders, generalLimiter, csrfProtection } = require('./middleware/security');
const { exposeUser } = require('./middleware/auth');
const { notFound, errorHandler } = require('./middleware/errorHandler');

const authRoutes = require('./routes/auth');
const productRoutes = require('./routes/products');
const cartRoutes = require('./routes/cart');
const checkoutRoutes = require('./routes/checkout');
const accountRoutes = require('./routes/account');
const adminRoutes = require('./routes/admin');

const app = express();

// Atrás do nginx (TLS termina no proxy): confia no 1º hop p/ IP e cookie secure.
app.set('trust proxy', 1);

// Views (EJS)
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Segurança de borda
app.use(securityHeaders());
app.use(morgan(config.env === 'production' ? 'combined' : 'dev'));
app.use(generalLimiter);

// Parsers
app.use(express.urlencoded({ extended: false, limit: '100kb' }));
app.use(express.json({ limit: '100kb' }));
app.use(cookieParser());

// Sessão (cookie httpOnly; secure em produção; sameSite contra CSRF)
app.use(session({
  name: 'sid',
  secret: config.secrets.sessionSecret,
  resave: false,
  saveUninitialized: false,
  rolling: true,
  cookie: {
    httpOnly: true,
    secure: config.env === 'production',
    sameSite: 'lax',
    maxAge: 1000 * 60 * 30, // 30 min
  },
}));

// Arquivos estáticos
app.use('/static', express.static(path.join(__dirname, '..', 'public')));

// Variáveis globais p/ as views
app.use(exposeUser);
app.use((req, res, next) => {
  res.locals.vuln = config.vuln;         // p/ o banner de modo vulnerável
  res.locals.baseUrl = config.baseUrl;
  res.locals.escapeHtml = require('./utils/sanitize').escapeHtml;
  next();
});

// Proteção CSRF (após sessão; expõe res.locals.csrfToken)
app.use(csrfProtection);

// Healthcheck
app.get('/health', (req, res) => res.json({ ok: true, ts: Date.now() }));

// Rotas
app.use('/', authRoutes);
app.use('/', productRoutes);
app.use('/', cartRoutes);
app.use('/', checkoutRoutes);
app.use('/', accountRoutes);
app.use('/', adminRoutes);

// 404 + erros
app.use(notFound);
app.use(errorHandler);

module.exports = app;
