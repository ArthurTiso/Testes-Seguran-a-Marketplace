# Guia passo a passo — subir o sistema numa VM Linux

Guia completo, do zero: escolher o Linux, criar a VM, instalar o sistema e
acessá-lo do seu computador (host) e pela aula.

---

## 1. Qual Linux baixar?

**Recomendado: Ubuntu Server 24.04 LTS** — foi nele que o sistema foi testado,
e o script de instalação (`deploy/instalar-vm.sh`) usa `apt`, que é o do Ubuntu/Debian.

- Download: https://ubuntu.com/download/server  (arquivo `.iso`, ~2–3 GB)
- Alternativas que também funcionam com o mesmo script:
  - **Ubuntu Desktop 24.04 LTS** — se quiser interface gráfica e rodar o
    MySQL Workbench dentro da própria VM (mais pesado, precisa de mais RAM).
  - **Debian 12** — leve e estável (mesmos comandos `apt`).

> Se a faculdade já te entrega uma VM pronta com Linux, pule para o **passo 4**.

---

## 2. Criar a VM (VirtualBox)

Se você mesmo vai criar a VM, use o **VirtualBox** (grátis): https://www.virtualbox.org/

1. **New** → Nome: `marketplace-ifsp` → Type: Linux → Version: Ubuntu (64-bit).
2. Aponte o ISO baixado no passo 1.
3. Recursos (mínimo confortável):
   - **CPU:** 2 núcleos
   - **RAM:** 2048 MB (Server) ou 4096 MB (Desktop)
   - **Disco:** 25 GB
4. **Rede (importante!):** em *Settings → Network → Adapter 1*, escolha
   **"Placa em modo Bridge" (Bridged Adapter)**. Assim a VM ganha um IP na
   mesma rede do seu PC/lab, e outras máquinas conseguem acessar o site.
   - (Se não puder usar Bridge, use NAT + encaminhamento de portas — ver passo 7.)
5. **Start** e instale o Ubuntu seguindo o assistente:
   - Crie seu usuário (ex.: `aluno`) e senha.
   - **Marque "Install OpenSSH server"** (no Server isso é uma opção na
     instalação; no Desktop instale depois com
     `sudo apt install -y openssh-server`). Isso permite acesso remoto e o
     túnel do Workbench.

Ao terminar, faça login na VM.

---

## 3. Descobrir o IP da VM

Na VM, rode:
```bash
ip a | grep "inet "
```
Anote o IP da sua rede (algo como `192.168.0.15` ou `10.0.0.15`) — é por ele
que você vai acessar o site. Vamos chamá-lo de **IP_DA_VM**.

---

## 4. Instalar o sistema

### Opção A — Automática (recomendada)
Na VM, com acesso à internet:

```bash
# 1) Ferramentas básicas
sudo apt update && sudo apt install -y git

# 2) Baixar o projeto
git clone https://github.com/ArthurTiso/Testes-Seguran-a-Marketplace.git
sudo mv Testes-Seguran-a-Marketplace /opt/marketplace
cd /opt/marketplace

# 3) Rodar o instalador (troque pelo IP real da VM)
sudo bash deploy/instalar-vm.sh IP_DA_VM
```

O script instala **Node.js, MariaDB e nginx**, cria o banco, gera as chaves
e o certificado HTTPS, sobe o serviço `systemd` e popula os dados de exemplo.
Ao final ele mostra o endereço `https://IP_DA_VM`.

> Se o `npm install` falhar na biblioteca `bcrypt`, instale as ferramentas de
> compilação e rode de novo:
> `sudo apt install -y build-essential python3 && cd /opt/marketplace && npm install`

### Opção B — Manual (para entender cada etapa)
```bash
# Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Banco de dados
sudo apt install -y mariadb-server
sudo systemctl enable --now mariadb
cd /opt/marketplace
sudo mysql < deploy/setup-db.sql       # cria banco + usuários

# Dependências e configuração
npm install
cp .env.example .env
npm run gen:key                        # copie as 2 linhas para o .env
nano .env                              # ajuste DB_PASSWORD e cole as chaves
npm run db:reset                       # cria tabelas + dados de exemplo

# Rodar (teste rápido, em primeiro plano)
npm start                              # http://IP_DA_VM:3000
```

---

## 5. Acessar o sistema do seu computador (host)

No navegador do seu PC:
- Com o instalador (nginx + HTTPS): **`https://IP_DA_VM`**
  (vai aparecer aviso de certificado autoassinado → "Avançado" → "Prosseguir").
- Sem nginx (só `npm start`): **`http://IP_DA_VM:3000`**

**Libere o firewall na VM** (se estiver ativo):
```bash
sudo ufw allow 80,443/tcp      # site
sudo ufw allow 22/tcp          # SSH (Workbench via túnel)
```

### Usuários de teste já criados
| E-mail | Senha | Papel |
|--------|-------|-------|
| admin@marketplace.local | `Admin@2026` | admin |
| vendedor@loja.com | `Vendedor@1` | vendedor |
| maria@email.com | `Cliente@123` | cliente |

---

## 6. Acessar o banco pelo MySQL Workbench

Do seu PC, com o Workbench instalado (ver detalhes em
`deploy/ACESSO-BANCO-WORKBENCH.md`):

**Jeito seguro (túnel SSH):** New Connection → *Standard TCP/IP over SSH*
- SSH Hostname: `IP_DA_VM:22` · SSH User/Senha: do Linux
- MySQL Hostname: `127.0.0.1` · Port `3306`
- Username: `leitor` (senha `LeitorSomenteLeitura!123`) ou `marketplace`

Mostre as tabelas `usuarios` (senha em bcrypt, CPF cifrado), `pagamentos`
(cartão cifrado) e `logs_auditoria`.

---

## 7. (Opcional) Se usou NAT em vez de Bridge

No VirtualBox → Settings → Network → Advanced → **Port Forwarding**, adicione:

| Nome | Host Port | Guest Port |
|------|-----------|------------|
| http | 8080 | 80 |
| https | 8443 | 443 |
| ssh | 2222 | 22 |

Aí você acessa do host por `https://localhost:8443` e o SSH por
`ssh -p 2222 aluno@localhost`.

---

## 8. Comandos úteis no dia a dia

```bash
sudo systemctl status marketplace     # ver se o app está rodando
sudo systemctl restart marketplace    # reiniciar (ex.: após mudar o .env)
sudo journalctl -u marketplace -f     # ver logs do app ao vivo
cd /opt/marketplace && npm run db:reset   # zerar e repopular o banco
node tests/pentest.js                  # testar que SQLi/IDOR estão bloqueados
```

## 9. Ligar o modo vulnerável (para os testes de invasão)

```bash
cd /opt/marketplace
nano .env          # mude a flag desejada para true (ex.: VULN_SQL_INJECTION=true)
sudo systemctl restart marketplace
# reproduza o ataque (ver docs/PENTEST.md), registre no formulário/planilha,
# e depois volte a flag para false + restart.
```

---

### Resumo do fluxo
1. Ubuntu Server 24.04 na VM (rede em **Bridge**) → anote o **IP_DA_VM**.
2. `git clone` do repositório em `/opt/marketplace`.
3. `sudo bash deploy/instalar-vm.sh IP_DA_VM`.
4. Acesse `https://IP_DA_VM` do seu PC e o banco pelo Workbench (túnel SSH).
