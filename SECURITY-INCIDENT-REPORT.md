# PumpWeb — Relatório de Incidente de Segurança

**Data do incidente:** 8 de Abril de 2026
**Data da descoberta:** 10 de Abril de 2026
**Data da remediação:** 11 de Abril de 2026
**Servidor afetado:** 165.245.173.218 (DigitalOcean, 1GB RAM, 1 vCPU, Ubuntu 24.04)

---

## 1. Resumo Executivo

O servidor de produção do PumpWeb foi comprometido por múltiplos vetores de ataque simultâneos, resultando em:

- Cryptominer rodando dentro do container Next.js e no host do servidor
- Banco de dados PostgreSQL completamente deletado e substituído por nota de resgate (ransomware)
- Exposição de credenciais (OAuth secrets, API keys, variáveis de ambiente)

O servidor foi descartado e um novo foi provisionado com correções de segurança aplicadas.

---

## 2. Vulnerabilidades Exploradas

### 2.1 — CVE-2025-66478 / CVE-2025-55182 (CVSS 10.0 — Crítico)

**O que é:** Vulnerabilidade de Remote Code Execution (RCE) no protocolo React Server Components (RSC) do Next.js. Permite que um atacante execute código arbitrário no servidor com um único request HTTP, sem autenticação.

**Versão afetada:** Next.js 15.5.6 (App Router com React 19)

**Como foi explorado:**
1. Atacante enviou request HTTP malicioso para a porta 3000 (exposta publicamente)
2. Através de prototype pollution na deserialização do RSC, obteve execução de código como usuário `nextjs`
3. Fez download do binário `manji.x86` (cryptominer conhecido) para `/tmp/`
4. Executou o minerador disfarçado como processo `httpd` com 10+ threads
5. O minerador consumiu os recursos do container, matando o Next.js — healthcheck falhando 3207 vezes seguidas

**Artefatos encontrados:**
- `/tmp/manji.x86` (58KB, ELF binary) — cryptominer
- Processos `httpd` (PID 2072 + 10 threads) rodando como `nextjs`
- Tentativas de leitura de config em `/tmp/.XIN-unix/config.json` e `/var/tmp/.unix/config.json`

**Referências:**
- https://nextjs.org/blog/CVE-2025-66478
- https://nextjs.org/blog/security-update-2025-12-11
- https://www.joesandbox.com/analysis/1859417/0/html (análise do manji.x86)

### 2.2 — PostgreSQL Exposto Publicamente com Credenciais Fracas

**O que é:** O banco de dados PostgreSQL estava acessível de qualquer IP na internet (porta 5432 aberta) com credenciais `postgres:postgres`.

**Como foi explorado:**
1. Bot automatizado encontrou a porta 5432 aberta
2. Autenticou com `postgres:postgres` (credencial padrão)
3. Deletou o banco `pump_admin_db` com todos os dados
4. Criou banco `readme_to_recover` com nota de resgate

**Nota de resgate encontrada:**
```
All your data is backed up. You must pay 0.0070 BTC to
bc1qh8jhaft6rn6wf0s9efwn4mwv22m6pnr7yjwfeq In 48 hours,
your data will be publicly disclosed and deleted.
After payment send mail to: dzen+3mnli@onionmail.org
Your DATAID is: 3MNLI
```

**Valor do resgate:** 0.0070 BTC ≈ R$ 4.000

### 2.3 — Cryptominer no Host

**O que é:** Além do minerador dentro do container, um segundo minerador foi encontrado rodando diretamente no servidor host.

**Artefatos encontrados:**
- Processo `/tmp/mysql` (PID 300240) rodando como usuário `do-agent`
- Consumindo 80% de CPU desde 08/Abr (2 dias)
- Processo pai `init` (PID 300197) com respawn automático — ao matar o processo, ele reiniciava

**Vetor provável:** Escalação a partir do container comprometido ou acesso direto via porta exposta.

### 2.4 — Portas Expostas Sem Firewall

O servidor não tinha firewall (UFW) ativo. Todas as portas dos containers Docker estavam acessíveis publicamente:

| Porta | Serviço | Risco |
|-------|---------|-------|
| 3000 | Next.js | RCE via CVE-2025-66478 |
| 8000 | Django API | Acesso direto sem proxy/SSL |
| 5432 | PostgreSQL | Acesso direto ao banco |

---

## 3. Impacto

| Recurso | Impacto |
|---------|---------|
| Banco de dados | **Perda total** — todos os dados deletados |
| Container pump-web | Comprometido com cryptominer |
| Servidor host | Cryptominer rodando consumindo 80% CPU |
| Credenciais OAuth | Expostas (CLIENT_ID, CLIENT_SECRET) |
| Django SECRET_KEY | Exposta |
| OpenAI API key | Exposta |
| Asaas API key | Exposta |
| Disponibilidade | Next.js offline (porta 3000 não respondia) |

---

## 4. Ações de Remediação

### 4.1 — Contenção Imediata (10/Abr)

1. Container `pump-web` comprometido parado e removido
2. Processo minerador no host (`/tmp/mysql`) e processo pai mortos
3. Next.js atualizado de 15.5.6 para 15.5.7 (patch de emergência)
4. Porta 3000 restringida a `127.0.0.1`
5. Container rebuildado e redeployado

### 4.2 — Novo Servidor (11/Abr)

Servidor antigo descartado. Novo droplet provisionado (`165.232.146.114`, 2GB RAM):

**Firewall (UFW):**
```
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp    # SSH
ufw allow 80/tcp    # HTTP redirect
ufw allow 443/tcp   # HTTPS
```

**Portas dos containers:**

| Serviço | Antes | Depois |
|---------|-------|--------|
| PostgreSQL | `0.0.0.0:5432` | Sem porta (rede Docker interna) |
| Django API | `0.0.0.0:8000` | `127.0.0.1:8000` |
| Next.js | `0.0.0.0:3000` | `127.0.0.1:3000` |
| Nginx | host network (80/443) | host network (80/443) |

**Topologia de rede:**
```
Internet → :443 (nginx + SSL) → 127.0.0.1:8000 (Django API)
                                → 127.0.0.1:3000 (Next.js)
PostgreSQL acessível apenas via rede Docker interna (pump_internal)
```

**Credenciais rotacionadas:**
- Django SECRET_KEY — nova gerada
- PostgreSQL — novo usuário `pump_user` com senha forte (44 caracteres, base64)
- OAuth CLIENT_ID e CLIENT_SECRET — novos gerados
- OpenAI API key — nova gerada
- Senha do admin — substituída por senha forte

**Hardening adicional:**
- SSH root login restrito a key only (`PermitRootLogin prohibit-password`)
- fail2ban instalado (proteção contra brute force SSH)
- unattended-upgrades ativo (patches de segurança automáticos)
- Certificado SSL Let's Encrypt com renovação automática (cron diário)
- Next.js atualizado de 15.5.6 para 15.5.15 (todas as CVEs corrigidas)

### 4.3 — Alterações no Código

**Repositório `pump-admin` (backend):**

| Arquivo | Mudança |
|---------|---------|
| `infra/docker-compose.prod.yml` | API porta `127.0.0.1:8000`, Postgres sem porta exposta, rede `pump_internal` |
| `.github/workflows/deploy.yml` | Paths atualizados de `/opt/academias/` para `/opt/pump/` |

**Repositório `pump-web` (frontend):**

| Arquivo | Mudança |
|---------|---------|
| `docker-compose.prod.yml` | Porta `127.0.0.1:3000`, healthcheck via `127.0.0.1` |
| `.github/workflows/deploy.yml` | Healthcheck via `127.0.0.1` |
| `package.json` + `package-lock.json` | Next.js 15.5.6 → 15.5.15 |

### 4.4 — Infraestrutura

| Componente | Configuração |
|------------|-------------|
| Droplet | Ubuntu 24.04, 2GB RAM, 1 vCPU |
| Docker | v29.x |
| Nginx | Alpine, network_mode: host, SSL termination |
| Certbot | Auto-renew via cron (3h diário) |
| CI/CD | 2 self-hosted GitHub Actions runners (pump-api-runner, pump-web-runner) |
| GitHub Secrets | ENV_BACKEND, ENV_PUMP_WEB, NEXT_PUBLIC_* atualizados |

---

## 5. Comparativo de Segurança

| Item | Servidor Antigo | Servidor Novo |
|------|----------------|---------------|
| Firewall | Desligado | UFW ativo (22/80/443) |
| PostgreSQL | `0.0.0.0:5432`, senha `postgres` | Sem porta, senha forte |
| API Django | `0.0.0.0:8000` | `127.0.0.1:8000` |
| Next.js | `0.0.0.0:3000`, v15.5.6 (CVE crítico) | `127.0.0.1:3000`, v15.5.15 |
| SSH | Login por senha permitido | Só SSH key |
| Brute force protection | Nenhuma | fail2ban |
| Updates automáticos | Não | unattended-upgrades |
| Credenciais | Fracas/padrão | Fortes/geradas |
| Acesso externo | 4 portas abertas | Só nginx (80/443) |
| Rede Docker | Default (bridge) | Isolada (pump_internal) |

---

## 6. Recomendações Futuras

1. **Habilitar backups automáticos** na DigitalOcean — restauração rápida em caso de novo incidente
2. **2FA no GitHub** — proteger acesso aos repos e secrets
3. **Monitoramento de uptime** — serviço como UptimeRobot ou BetterStack para alertas
4. **Rate limiting no nginx** — proteção contra brute force na API
5. **Runners como usuário não-root** — reduzir superfície de ataque
6. **Rotação periódica de credenciais** — especialmente API keys de terceiros

---

## 7. Lições Aprendidas

1. **Nunca expor banco de dados para a internet** — PostgreSQL deve ser acessível apenas via rede interna
2. **Nunca usar credenciais padrão em produção** — `postgres:postgres` é a primeira coisa que bots tentam
3. **Firewall é obrigatório** — mesmo com Docker, portas podem ser expostas sem intenção
4. **Manter dependências atualizadas** — a diferença entre 15.5.6 (vulnerável) e 15.5.7 (patcheado) era uma minor version
5. **Princípio do menor privilégio** — serviços só devem escutar em localhost quando há um proxy reverso na frente
6. **Backup não é opcional** — sem backup, perda de dados é irrecuperável
