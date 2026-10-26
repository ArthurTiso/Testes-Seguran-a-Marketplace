'use strict';
// Gera segredos para colar no .env
const crypto = require('crypto');
console.log('DATA_ENCRYPTION_KEY=' + crypto.randomBytes(32).toString('hex'));
console.log('SESSION_SECRET=' + crypto.randomBytes(48).toString('base64url'));
