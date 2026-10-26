#!/usr/bin/env bash
# Gera certificado TLS autoassinado para HTTPS na VM (uso didático).
# Uso: sudo bash deploy/gen-cert.sh [IP_OU_HOST]
set -euo pipefail
HOST="${1:-localhost}"
DIR="/etc/ssl/marketplace"
sudo mkdir -p "$DIR"
sudo openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout "$DIR/server.key" \
  -out "$DIR/server.crt" \
  -subj "/C=BR/ST=SP/L=Caraguatatuba/O=IFSP/CN=${HOST}" \
  -addext "subjectAltName=DNS:${HOST},IP:${HOST}" 2>/dev/null || \
sudo openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout "$DIR/server.key" -out "$DIR/server.crt" \
  -subj "/C=BR/ST=SP/L=Caraguatatuba/O=IFSP/CN=${HOST}"
sudo chmod 600 "$DIR/server.key"
echo "Certificado gerado em $DIR (CN=${HOST})"
