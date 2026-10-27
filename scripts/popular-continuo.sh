#!/usr/bin/env bash
# ==========================================================================
#  Adiciona um lote de usuários fake (5 a 30) a cada 5 minutos, ENQUANTO o
#  serviço marketplace estiver ativo. Para a demonstração "banco vivo".
#
#  Uso rápido (em primeiro plano, Ctrl+C para parar):
#     cd /opt/marketplace && bash scripts/popular-continuo.sh
#
#  Em segundo plano (continua após fechar o terminal):
#     cd /opt/marketplace && nohup bash scripts/popular-continuo.sh >/tmp/popular.log 2>&1 &
#
#  Ou como serviço systemd (recomendado): ver deploy/popular-usuarios.service
# ==========================================================================
set -u
cd "$(dirname "$0")/.." || exit 1
INTERVALO="${INTERVALO:-300}"   # 5 minutos

echo "Iniciando povoamento a cada ${INTERVALO}s (apenas enquanto o marketplace estiver ativo)."
while true; do
  if systemctl is-active --quiet marketplace 2>/dev/null; then
    node scripts/gerar-usuarios.js
  else
    echo "[$(date '+%H:%M:%S')] marketplace parado — aguardando..."
  fi
  sleep "${INTERVALO}"
done
