# Cardápio Digital — Tapiocaria Tambaú

Sistema completo de cardápio digital com pedidos online, pagamento integrado via Mercado Pago, painel administrativo com analytics e painel da cozinha em tempo real.

---

## Funcionalidades

### Para o Cliente

**Cardápio Online**
- Menu organizado por categorias com ordenação customizável pelo admin
- Fotos dos produtos em alta qualidade
- Descrições e preços em BRL
- Navegação por abas de categorias com scroll suave
- Produtos esgotados aparecem com selo "Esgotado" (imagem em preto e branco, botão desabilitado)
- Layout mobile-first, responsivo para celular e desktop
- Indicador de status da loja (aberta/fechada) com horário de funcionamento expandível

**Carrinho de Compras**
- Adicionar produtos com quantidade personalizável
- Seleção de adicionais (extras) com preço individual
- Mesmo produto com extras diferentes aparece como itens separados
- Editar quantidade (+/-) e remover itens
- Carrinho persistido no navegador (sobrevive a refresh)
- Dados do cliente (nome, telefone, endereço) persistidos entre pedidos
- Barra flutuante na parte inferior mostrando total e quantidade

**Entrega ou Retirada**
- Escolha entre "Retirar no local" ou "Entrega"
- Formulário de endereço com autopreenchimento via CEP (integração ViaCEP)
- CEP preenche automaticamente rua, bairro, cidade e estado
- Campo de número e complemento manuais
- Validação: só permite prosseguir quando endereço está completo (se entrega)

**Pagamento Integrado (Mercado Pago)**
- Checkout Transparente — cliente não sai da aplicação
- **Pix**: QR Code gerado em tempo real + código copia-e-cola com countdown de expiração
- **Cartão de Crédito**: formulário com tokenização via MercadoPago.js (dados do cartão nunca passam pelo servidor)
- Parcelamento em até 6x
- Detecção de pagamento em tempo real via WebSocket + polling como fallback
- Redirecionamento automático para página de tracking após aprovação
- Integração com sandbox do Mercado Pago para testes

**Acompanhamento do Pedido**
- Número do pedido sequencial diário (#1, #2, #3...)
- Página de tracking com status visual: Pago → Preparando → Pronto → Em Rota de Entrega → Entregue
- Barra de progresso colorida com ícones por status
- Atualização em tempo real via WebSocket (fallback: polling a cada 30s)
- Resumo do pedido com itens, extras e total
- Banner "Acompanhar Pedido" na página inicial para pedidos recentes (até 4h)

---

### Para o Restaurante (Cozinha)

**Painel da Cozinha (/kitchen)**
- Acesso protegido por login (mesmo admin)
- Kanban com 3 colunas: **Pagos** → **Preparando** → **Prontos**
- Cards mostram: número do pedido, nome do cliente, tempo desde criação, itens com extras, total
- Badge de **"Entrega"** (azul) com endereço ou **"Retirada"** (verde)
- Botões para mover pedido entre colunas (Preparar → Pronto → Enviar → Entregue)
- Pedido entregue desaparece do painel
- Conexão WebSocket para atualizações em tempo real
- Botão de logout no cabeçalho

---

### Para o Administrador (/admin)

**Login Seguro**
- Autenticação via email/senha com JWT
- Token com validade de 24 horas
- Todas as rotas de admin protegidas

**Dashboard com Analytics**
- 4 cards de métricas: Pedidos Hoje, Receita Hoje, Ticket Médio, Em Preparo
- Gráfico de área: Receita dos últimos 7 dias
- Gráfico de barras: Receita por hora (hoje)
- Gráfico de donut: Pedidos por status com legenda
- Ranking: Produtos mais vendidos do dia com barras animadas
- Atualização automática a cada 30 segundos
- Biblioteca: Recharts

**Controle da Loja**
- Indicador de status real (aberta/fechada com motivo)
- Modo de operação em 3 estados: **Automático** (segue horário) | **Forçar Aberta** (override) | **Forçar Fechada** (override)
- Configurar horário de abertura e fechamento
- Selecionar dias da semana (Dom-Sáb) com toggles visuais
- Quando fechado: banner vermelho no cardápio, pedidos bloqueados automaticamente

**Gerenciamento de Categorias**
- Listar todas as categorias com contagem de produtos e indicador ativa/inativa
- Drag-and-drop para reordenar categorias (dnd-kit) — ordem reflete no cardápio do cliente
- Criar/editar categoria (nome, descrição, ordem)
- Toggle ativar/desativar categoria (botão Power)
- Botão para reordenar produtos dentro de cada categoria via dialog com drag-and-drop
- Restrições de drag: vertical axis + parent element para evitar overflow

**Gerenciamento de Produtos**
- Listar todos os produtos com busca em tempo real e filtro por categoria
- Thumbnail, nome, categoria, preço, status, quantidade de extras
- Criar/editar produto (nome, descrição, preço, categoria, imagem)
- Upload de imagem com drag-drop ou click (JPG, PNG, WebP, até 5MB)
- Preview da imagem antes de salvar
- Toggle ativar/desativar produto (marca como "Esgotado" no cardápio)
- Gerenciamento de adicionais (extras) por produto: criar, editar, desativar
- Ordenação customizável (`sortOrder`) que afeta o cardápio do cliente

**Gerenciamento de Pedidos (Kanban)**
- Kanban com 5 colunas arrastáveis: **Aguardando** → **Pago** → **Preparando** → **Pronto** → **Em Rota**
- Drag-and-drop de cards entre colunas para mudar status (validação de transições)
- Visual feedback: borda verde para drop válido, vermelha para inválido
- Cada card mostra: número, cliente, tempo, tipo entrega/retirada, método de pagamento, itens expandíveis
- Botão "Marcar Entregue" nos cards "Em Rota" e "Pronto" (retirada)
- Botão cancelar (X) em qualquer card ativo
- Seção "Finalizados" colapsável com pedidos entregues e cancelados
- Drag overlay flutuante com rotação visual ao arrastar
- Otimistic updates com rollback em caso de erro
- Atualizações em tempo real via WebSocket + polling como fallback
- Suporte a touch (mobile) com delay de ativação

---

## Segurança

- **Dados do cartão nunca tocam o servidor** — tokenização feita pelo MercadoPago.js no navegador do cliente
- **Total sempre recalculado no backend** — preços do banco de dados, nunca confia no frontend
- **Webhook com validação de assinatura HMAC** — rejeita webhooks falsos com 403
- **Webhook responde 200 imediatamente** — processamento assíncrono via fila (BullMQ)
- **Processamento idempotente** — mesmo webhook recebido múltiplas vezes não duplica processamento
- **Snapshot de preços nos pedidos** — nome e preço do produto salvos no momento da compra
- **Rotas admin/cozinha protegidas por JWT** — endpoints públicos (menu, criar pedido) separados dos privados
- **Upload de arquivos validado** — apenas imagens permitidas (JPG, PNG, WebP), tipos inválidos rejeitados, máximo 5MB

---

## Real-time (WebSocket)

O sistema utiliza Socket.io com namespace `/kitchen` para comunicação em tempo real:

| Evento | Descrição | Ouvintes |
|--------|-----------|----------|
| `order:new` | Novo pedido criado/pago | Cozinha, Admin Kanban |
| `order:status-changed` | Status do pedido alterado | Cozinha, Admin Kanban, Tracking do Cliente, Checkout (Pix) |

**Páginas com WebSocket:**
- `/kitchen` — novos pedidos e mudanças de status
- `/admin/orders` — kanban atualiza em tempo real
- `/checkout` (Pix) — detecta pagamento instantaneamente
- `/order/[id]` — cliente vê mudanças de status em tempo real

---

## Stack Técnica

| Camada | Tecnologia |
|--------|-----------|
| Frontend | Next.js 14 (App Router), TypeScript, Tailwind CSS, ShadCN UI |
| Estado | Zustand (carrinho, auth), React Query (dados do servidor) |
| Animações | Framer Motion |
| Drag & Drop | @dnd-kit (core, sortable, modifiers, utilities) |
| Gráficos | Recharts |
| Fontes | Poppins (display/títulos), Roboto (corpo) via Google Fonts |
| Backend | NestJS, TypeScript, MikroORM |
| Banco de Dados | PostgreSQL 17 |
| Filas | BullMQ + Redis 7 |
| Pagamento | Mercado Pago SDK (Checkout Transparente) |
| Real-time | WebSocket (Socket.io) |
| Autenticação | JWT + Passport |
| Upload | Multer (armazenamento local) |
| CEP | ViaCEP API |
| Monorepo | pnpm workspaces + Turborepo |
| Infra | Docker Compose (PostgreSQL + Redis) |

---

## Fluxo do Pedido

```
Cliente faz pedido → Aguardando Pagamento
                           ↓
                    Pagamento aprovado → Pago
                           ↓
                    Admin/Cozinha aceita → Preparando
                           ↓
                    Pedido pronto → Pronto
                           ↓
              Entrega: → Em Rota de Entrega → Entregue
              Retirada: → Entregue (direto)
```

Qualquer status ativo pode ser cancelado pelo admin.

---

## Como Rodar

```bash
# 1. Subir banco e redis
docker compose up -d

# 2. Instalar dependências
pnpm install

# 3. Buildar pacote compartilhado
pnpm --filter @cardapio/shared build

# 4. Rodar migrações e seed
cd apps/api
npx mikro-orm migration:up
npx ts-node src/seeders/run-seed.ts

# 5. Iniciar API (porta 3333)
pnpm dev

# 6. Iniciar Frontend (porta 3847)
cd ../web
pnpm dev
```

**Admin:** `admin@tapiocaria.com` / `admin123`

---

## Estrutura do Projeto

```
cardapio-digital/
├── apps/
│   ├── api/          → Backend NestJS
│   │   ├── src/
│   │   │   ├── entities/        → Modelos do banco (Order, Product, Category, etc.)
│   │   │   ├── modules/
│   │   │   │   ├── admin/       → CRUD admin (categorias, produtos, extras, reorder)
│   │   │   │   ├── auth/        → Login JWT
│   │   │   │   ├── orders/      → Pedidos (criar, status, cozinha)
│   │   │   │   ├── payments/    → Pix, Cartão, Webhook, Processador de fila
│   │   │   │   ├── products/    → Menu público
│   │   │   │   ├── store/       → Horário de funcionamento e controle manual
│   │   │   │   └── websocket/   → Real-time (Socket.io)
│   │   │   ├── migrations/
│   │   │   └── seeders/
│   │   └── uploads/             → Imagens dos produtos
│   └── web/          → Frontend Next.js
│       └── src/
│           ├── app/
│           │   ├── _components/ → Menu, cards, carrinho flutuante
│           │   ├── admin/       → Dashboard, categorias, produtos, pedidos, login
│           │   ├── cart/        → Carrinho com endereço
│           │   ├── checkout/    → Pagamento (Pix, Cartão)
│           │   ├── kitchen/     → Painel da cozinha
│           │   └── order/[id]/  → Tracking do pedido
│           ├── components/ui/   → ShadCN UI components
│           ├── hooks/           → React Query hooks (menu, orders, payments)
│           ├── stores/          → Zustand (cart, auth)
│           └── lib/             → API clients, utilitários
├── packages/
│   └── shared/       → Tipos compartilhados (OrderStatus, PaymentMethod, etc.)
├── docker-compose.yml
└── turbo.json
```
