'use strict';

/**
 * Carrega e valida a configuração a partir das variáveis de ambiente (.env).
 * Centraliza também as flags do MODO VULNERÁVEL usadas nos testes de invasão.
 */
require('dotenv').config();

function bool(v, def = false) {
  if (v === undefined || v === null || v === '') return def;
  return String(v).toLowerCase() === 'true' || v === '1';
}

const config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3000', 10),
  baseUrl: process.env.APP_BASE_URL || 'http://localhost:3000',

  db: {
    host: process.env.DB_HOST || '127.0.0.1',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    user: process.env.DB_USER || 'marketplace',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'marketplace',
  },

  secrets: {
    dataKey: process.env.DATA_ENCRYPTION_KEY || '',
    sessionSecret: process.env.SESSION_SECRET || 'dev-session-secret',
    bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS || '12', 10),
  },

  // -------- Flags do modo vulnerável (OWASP / pentest) --------
  vuln: {
    enabled: bool(process.env.VULN_MODE),
    sha1Passwords: bool(process.env.VULN_SHA1_PASSWORDS),
    sqlInjection: bool(process.env.VULN_SQL_INJECTION),
    xss: bool(process.env.VULN_XSS),
    noRateLimit: bool(process.env.VULN_NO_RATE_LIMIT),
    idor: bool(process.env.VULN_IDOR),
    verboseErrors: bool(process.env.VULN_VERBOSE_ERRORS),
    plaintextSensitive: bool(process.env.VULN_PLAINTEXT_SENSITIVE),
  },
};

// Avisos de configuração insegura (ajuda o aluno a perceber o que está ligado)
function validate() {
  const warnings = [];
  if (!config.secrets.dataKey || config.secrets.dataKey.length !== 64) {
    warnings.push('DATA_ENCRYPTION_KEY ausente ou != 64 hex. Gere com: npm run gen:key');
  }
  if (config.secrets.sessionSecret.startsWith('troque') ||
      config.secrets.sessionSecret === 'dev-session-secret') {
    warnings.push('SESSION_SECRET está no valor padrão. Troque no .env.');
  }
  const ligadas = Object.entries(config.vuln)
    .filter(([k, v]) => v && k !== 'enabled')
    .map(([k]) => k);
  if (config.vuln.enabled || ligadas.length) {
    warnings.push('*** MODO VULNERÁVEL ATIVO *** flags: ' +
      (ligadas.length ? ligadas.join(', ') : '(apenas banner)'));
  }
  return warnings;
}

config.validate = validate;
module.exports = config;
