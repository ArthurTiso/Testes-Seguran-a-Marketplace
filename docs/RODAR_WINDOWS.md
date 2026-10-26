# Como rodar no Windows

Os comandos do README são de Linux. No Windows há 3 caminhos — escolha um.

> ⚠ Lembre: a atividade pede o sistema **hospedado numa VM Linux**. Rodar no
> Windows é ótimo para **desenvolver/testar**, mas a demonstração final deve
> ser na VM. Veja `docs/INSTALACAO_VM.md`.

---

## Caminho 1 — WSL2 (recomendado): rodar os comandos Linux SEM alteração

O WSL2 roda um Ubuntu dentro do Windows. Assim os comandos do README funcionam
exatamente como estão.

1. Abra o **PowerShell como Administrador** e instale o WSL:
   ```powershell
   wsl --install -d Ubuntu-24.04
   ```
   Reinicie se pedir, e crie usuário/senha do Ubuntu quando abrir.

2. Dentro do **Ubuntu (WSL)**, rode os mesmos comandos da VM:
   ```bash
   sudo apt update && sudo apt install -y git
   git clone https://github.com/ArthurTiso/Testes-Seguran-a-Marketplace.git
   cd Testes-Seguran-a-Marketplace
   # instala Node + MariaDB dentro do WSL e sobe tudo:
   sudo apt install -y nodejs npm mariadb-server
   sudo service mariadb start
   sudo mysql < deploy/setup-db.sql
   npm install
   cp .env.example .env
   npm run gen:key            # copie as 2 linhas para o .env
   nano .env                  # NODE_ENV=development + cole as chaves
   npm run db:reset
   npm start
   ```
3. No navegador do Windows, acesse **http://localhost:3000**
   (o WSL compartilha o `localhost` com o Windows).

> No WSL use `sudo service mariadb start` (não `systemctl`).

---

## Caminho 2 — Windows nativo (sem WSL)

Instale as versões Windows e traduza 2 comandos.

### Pré-requisitos
1. **Node.js LTS** — https://nodejs.org (instalador .msi). Na instalação, marque
   a opção **"Tools for Native Modules"** (ajuda a compilar o `bcrypt`).
2. **MySQL Community Server** — https://dev.mysql.com/downloads/installer/
   (MySQL Installer → instale *Server* e, se quiser, o *Workbench*).
   Defina uma **senha de root** e deixe o serviço rodando.
3. (Opcional) **Git** — https://git-scm.com/download/win

### Passos (use o **Prompt de Comando / CMD** na pasta do projeto)
```bat
npm install
copy .env.example .env
npm run gen:key
notepad .env
```
No `notepad`, ajuste e salve:
- `NODE_ENV=development`
- `DB_HOST=127.0.0.1`  `DB_PORT=3306`  `DB_NAME=marketplace`
- `DB_USER=marketplace`  `DB_PASSWORD=TroqueEstaSenhaForte!123`
- cole as linhas `DATA_ENCRYPTION_KEY=...` e `SESSION_SECRET=...` do `gen:key`

Criar o banco (o `mysql` fica em `C:\Program Files\MySQL\MySQL Server 8.0\bin`;
se "mysql" não for reconhecido, rode com o caminho completo ou adicione ao PATH):
```bat
mysql -u root -p < deploy\setup-db.sql
```
(Digite a senha de root quando pedir.)

Depois:
```bat
npm run db:reset
npm start
```
Acesse **http://localhost:3000**.

### ⚠ Se usar PowerShell em vez do CMD
O PowerShell **não aceita** o `<` para redirecionar arquivo. Troque só a linha
do banco por:
```powershell
Get-Content deploy\setup-db.sql | mysql -u root -p
```
E para copiar: `Copy-Item .env.example .env`.

---

## Caminho 3 — A VM Linux (entrega da atividade)
É o exigido pela disciplina. Guia completo em `docs/INSTALACAO_VM.md`.
O Windows, nesse caso, é só o seu computador "host" que acessa a VM pelo
navegador e pelo MySQL Workbench.

---

## Observações
- Em qualquer caminho, use **`NODE_ENV=development`** ao rodar em `http://localhost`
  (sem HTTPS), senão o cookie de sessão `secure` impede o login.
- Sem o nginx, o acesso é por **`http://localhost:3000`** (e não `https://`).
- O serviço `systemd` (`deploy/marketplace.service`) e o nginx são só para a VM
  Linux; no Windows nativo você sobe com `npm start`.
