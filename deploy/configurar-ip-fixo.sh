#!/usr/bin/env bash
# ==========================================================================
#  Configura um IP FIXO PERMANENTE na VM (sobrevive a reiniciar).
#  Pensado para a rede da sala do IFSP, onde o DHCP bloqueia a VM.
#
#  Uso (na VM):
#     sudo bash deploy/configurar-ip-fixo.sh                 # usa 10.81.211.224
#     sudo bash deploy/configurar-ip-fixo.sh 10.81.211.224 10.81.211.254
#
#  Para VOLTAR ao DHCP depois (ex.: usar a VM em casa):
#     sudo mv /etc/netplan/00-installer-config.yaml.bak \
#             /etc/netplan/00-installer-config.yaml && sudo netplan apply
# ==========================================================================
set -euo pipefail

IP="${1:-10.81.211.224}"
GW="${2:-10.81.211.254}"

# Detecta a interface de rede (cai para enp0s3 se não achar).
IFACE="$(ls /sys/class/net | grep -v '^lo$' | head -1)"
IFACE="${IFACE:-enp0s3}"

echo "==> Interface: $IFACE   IP: $IP/24   Gateway: $GW"

CFG=/etc/netplan/00-installer-config.yaml
if [ -f "$CFG" ] && [ ! -f "${CFG}.bak" ]; then
  cp "$CFG" "${CFG}.bak"
  echo "==> Backup da config original em ${CFG}.bak"
fi

cat > "$CFG" <<EOF
# Config de rede com IP fixo (gerada por configurar-ip-fixo.sh)
network:
  version: 2
  ethernets:
    ${IFACE}:
      dhcp4: false
      addresses: [${IP}/24]
      routes:
        - to: default
          via: ${GW}
      nameservers:
        addresses: [8.8.8.8, 1.1.1.1]
EOF

chmod 600 "$CFG"
netplan apply
sleep 2
echo "==> Pronto. Endereço atual:"
ip -4 addr show "$IFACE" | grep inet || true
echo "==> Teste de rota: ping no gateway..."
ping -c 2 "$GW" || echo "(sem resposta do gateway — verifique se está na rede da sala e em modo Bridge)"
