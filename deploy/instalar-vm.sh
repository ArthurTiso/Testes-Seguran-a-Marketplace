#!/usr/bin/env bash
# ==========================================================================
#  Instalação do Marketplace numa VM Linux (Ubuntu/Debian).
#  Rode a partir da raiz do projeto já copiado para /opt/marketplace:
#     cd /opt/marketplace && sudo bash deploy/instalar-vm.sh [IP_DA_VM]
# ==========================================================================
set -euo pipefail
HOST="${1:-localhost}"
APP_DIR="/opt/marketplace"

echo "==> 1. Instalando pacotes (Node.js, MariaDB, nginx)..."
sudo apt-get update -qq
sudo apt-get install -y -qq ca-certificates curl gnupg nginx mariadb-server openssl
# Node.js 20 LTS (via NodeSource) se o node não existir
if ! command -v node >/dev/null; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
  sudo apt-get install -y nodejs
fi
node --version

echo "==> 2. Subindo o MariaDB..."
sudo systemctl enable --now mariadb

echo "==> 3. Criando banco e usuários..."
sudo mysql < "$APP_DIR/deploy/setup-db.sql"

echo "==> 4. Instalando dependências do app..."
cd "$APP_DIR"
npm install --omit=dev --no-fund --no-audit

echo "==> 5. Configurando .env (se ainda não existir)..."
if [ ! -f .env ]; then
  cp .env.example .env
  KEYS=$(node scripts/gen-keys.js)
  DK=$(echo "$KEYS" | grep DATA_ENCRYPTION_KEY | cut -d= -f2)
  SK=$(echo "$KEYS" | grep SESSION_SECRET | cut -d= -f2-)
  sed -i "s|^DATA_ENCRYPTION_KEY=.*|DATA_ENCRYPTION_KEY=$DK|" .env
  sed -i "s|^SESSION_SECRET=.*|SESSION_SECRET=$SK|" .env
  sed -i "s|^APP_BASE_URL=.*|APP_BASE_URL=https://$HOST|" .env
  echo "   .env criado (lembre de conferir DB_PASSWORD)."
fi

echo "==> 6. Criando schema e dados de exemplo..."
npm run db:reset

echo "==> 7. Certificado TLS autoassinado..."
sudo bash deploy/gen-cert.sh "$HOST"

echo "==> 8. Configurando nginx..."
sudo cp deploy/nginx-marketplace.conf /etc/nginx/sites-available/marketplace
sudo ln -sf /etc/nginx/sites-available/marketplace /etc/nginx/sites-enabled/marketplace
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl reload nginx

echo "==> 9. Criando usuário de sistema e serviço systemd..."
id marketplace >/dev/null 2>&1 || sudo useradd -r -s /usr/sbin/nologin marketplace
sudo chown -R marketplace:marketplace "$APP_DIR"
sudo cp deploy/marketplace.service /etc/systemd/system/marketplace.service
sudo systemctl daemon-reload
sudo systemctl enable --now marketplace

echo
echo "============================================================"
echo " Instalação concluída!"
echo " Acesse:  https://$HOST"
echo " Firewall: libere 80/443 (e 3306 só se for usar Workbench remoto)."
echo " Logs do app:  sudo journalctl -u marketplace -f"
echo "============================================================"
