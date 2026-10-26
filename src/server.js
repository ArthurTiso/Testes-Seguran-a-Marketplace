'use strict';

const app = require('./app');
const config = require('./config');

// Mostra avisos de configuração/segurança no boot.
for (const w of config.validate()) console.warn('[aviso] ' + w);

const server = app.listen(config.port, () => {
  console.log(`\n  Marketplace rodando em ${config.baseUrl}  (porta ${config.port})`);
  console.log(`  Ambiente: ${config.env}`);
  if (config.vuln.enabled || Object.values(config.vuln).some(Boolean)) {
    console.log('  >>> MODO VULNERÁVEL ATIVO - use apenas para os testes autorizados <<<');
  }
  console.log('');
});

// Encerramento gracioso
for (const sig of ['SIGINT', 'SIGTERM']) {
  process.on(sig, () => {
    console.log(`\n${sig} recebido, encerrando...`);
    server.close(() => process.exit(0));
  });
}
