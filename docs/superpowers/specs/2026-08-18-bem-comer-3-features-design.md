# Bem Comer — 3 features (reordenar grupos, limite combinado de carnes, auto-comprovante)

**Data:** 2026-08-18
**Repo:** cardapio-digital-2 (NestJS api + Next.js web + `@cardapio/shared`, MikroORM, Docker Compose prod)
**Origem:** pedido do cliente (Raphael/dono) via WhatsApp.

## Escopo

Três features independentes. Nenhuma altera dados existentes de forma destrutiva.

---

## F1 — Reordenar grupos de opções (drag-and-drop)

**Objetivo:** admin arrasta os grupos de opções de um produto para mudar a ordem de
exibição (o dono quer Churrasco → Proteína → Salada). A nova ordem tem que refletir
tanto no admin quanto na tela do cliente.

**Estado atual (já pronto no backend):**
- `option_groups.sortOrder` (coluna explícita) — `apps/api/src/entities/option-group.entity.ts:22`.
- Endpoint `PATCH /api/admin/option-groups/reorder` (usa `ReorderDto { items:[{id,sortOrder}] }`)
  → `ReorderAdminOptionGroupsUseCase` → repo grava `sortOrder`. Tudo funcionando.
- Admin já ordena por `sortOrder` em memória
  (`mikro-orm-admin-product.read-repository.ts` `compareOptionGroups`).
- Padrão DnD `@dnd-kit` já usado em Categorias
  (`apps/web/src/app/admin/categories/_components/categories-client/*` +
  `use-categories-page.ts` `handleCategoryReorder`).

**Mudanças:**
1. `apps/web/src/app/admin/products/_components/products-client/index.tsx` — envolver a
   lista de grupos (`product.optionGroups.map`) em `DndContext`/`SortableContext`
   (`closestCenter`, sensores, `verticalListSortingStrategy`), extrair a linha do grupo
   para um `sortable-option-group-row` com alça `GripVertical` (espelhar
   `sortable-category-card.tsx`).
2. `apps/web/src/app/admin/products/_components/use-products-page.ts` — adicionar
   `reorderOptionGroupsMutation` mirando `handleCategoryReorder`: `arrayMove`, update
   otimista via `setQueryData`, `mutate(items)` → `PATCH /api/admin/option-groups/reorder`.
   Reordenar é por-produto (só os grupos daquele produto).
3. **Checkpoint tela do cliente:** confirmar que o menu público retorna grupos ordenados
   por `sortOrder`. O read do pedido/catálogo
   (`apps/api/src/modules/orders/adapters/persistence/mikro-orm-order-product-catalog.repository.ts`)
   e/ou o menu público precisam ordenar por `sortOrder`; se não ordenam, adicionar
   `orderBy: { sortOrder: 'ASC' }` no populate ou sort em memória. Sem isso o cliente não
   vê a nova ordem.

**Fora de escopo:** reordenar as *opções dentro* de um grupo (só os grupos).

---

## F2 — Limite combinado de carnes (churrasco + proteína) — configurável

**Objetivo:** na Quentinha M, o cliente só pode escolher **2 pedaços de carne no total**
somando Churrasco + Proteína. 2 proteínas → trava churrasco; 2 churrascos → trava
proteína; 1+1 → trava os dois. O teto é **configurável por produto** (M=2, G=3, etc) e o
conjunto de grupos vinculados é escolhido no admin (primitivo geral, não hardcode).

**Estado atual:** grupos são 100% independentes. Só existe `minSelections`/`maxSelections`
por grupo. Não há nenhum conceito de limite cruzando grupos, nem no modelo, nem no cliente
(`product-detail-dialog.tsx`), nem no server (`order-item-snapshot.policy.ts`).

**Modelo de dados (novo, limpo — sem magic string):**
- Nova entity `CombinedLimit` (tabela `combined_limits`): `id`, `product` (ManyToOne),
  `name` (ex: "Carnes"), `maxSelections` (int ≥ 1), `isArchived` default false.
- `OptionGroup` ganha FK opcional `combinedLimit?: CombinedLimit` (nullable ManyToOne).
- Grupos que apontam pro mesmo `CombinedLimit` compartilham o teto.
- Migração MikroORM: cria `combined_limits` + coluna nullable `option_groups.combined_limit_id`
  (nenhuma alteração destrutiva; grupos existentes ficam com NULL = sem limite combinado).
- Shared type (`packages/shared/src/types/menu.ts`): `OptionGroup` ganha
  `combinedLimitId?: string`; novo tipo `CombinedLimit { id, name, maxSelections }` exposto
  junto do produto.

**Admin (API):**
- CRUD de `CombinedLimit` por produto: criar (`name`, `maxSelections`), editar, arquivar.
  Endpoints sob `/api/admin/products/:productId/combined-limits` (ou similar, seguindo o
  padrão dos option-groups). Atribuir/desatribuir grupo a um limite = campo
  `combinedLimitId` no update do grupo (`update-option-group.dto.ts` ganha
  `combinedLimitId?: string | null`).
- Read model do produto no admin passa a incluir os `combinedLimits` e o `combinedLimitId`
  de cada grupo.

**Admin (UI):** no painel de grupos do produto
(`products-client/index.tsx`), subseção "Limites combinados": listar/criar limites
(nome + máx), e em cada grupo um seletor "Limite combinado" (nenhum / <limite>). Simples,
sem DnD.

**Enforcement — cliente** (`apps/web/src/app/_components/product-detail-dialog.tsx`):
- Para cada `CombinedLimit`, somar as seleções de todos os grupos vinculados.
- `isMaxed` de uma opção passa a ser: `grupo cheio` **OU** `combinado cheio`. Quando o
  combinado atinge o teto, desabilitar opções não-selecionadas em **todos** os grupos do
  limite.
- Mostrar contador do combinado (ex: "Carnes 2/2") junto dos grupos vinculados.
- `allRequiredSatisfied` inalterado (min é por-grupo).

**Enforcement — server** (`apps/api/src/modules/orders/domain/order-item-snapshot.policy.ts`,
`resolveCompoundSelection`):
- Depois de validar min/max por-grupo, agrupar as seleções por `combinedLimitId`, somar
  `optionIds.length`, e lançar 400 se `soma > combinedLimit.maxSelections`
  (mensagem: "As carnes permitem no máximo N no total").
- O catalog repo
  (`mikro-orm-order-product-catalog.repository.ts`) precisa popular `combinedLimit` dos
  grupos pra policy enxergar o teto.

**Interação com max por-grupo:** ambos valem; o mais apertado limita. Ex: Proteína "Até 2",
Churrasco "Até 2", combinado "Carnes" = 2.

---

## F3 — Auto-emitir comprovante quando chega em "pronto" (kiosk silencioso)

**Objetivo:** hoje alguém clica "Comprovante" → nova aba → Imprimir. Automatizar: quando o
pedido vira `ready`, a estação de impressão do balcão imprime o comprovante sozinha, sem
diálogo.

**Estado atual:** "comprovante" NÃO é fiscal. É só a página client-side
`apps/web/src/app/receipt/[id]/page.tsx` que renderiza cupom 80mm e chama `window.print()`.
Disparo hoje é 100% manual (link "Comprovante" no card do kanban). O kanban do admin
(`orders-client/*` + `use-orders-page.ts`) já assina o socket `order_status_changed`
(namespace `kitchen`, `KitchenGateway`).

**Design (sem backend novo):**
1. **Toggle "Estação de impressão"** na tela do kanban admin
   (`apps/web/src/app/admin/orders/...`), persistido em `localStorage`
   (ex: `bemcomer.printStation`). Default **desligado**. Só a aba com o toggle ligado
   imprime — evita que toda aba de admin aberta imprima o mesmo pedido.
2. Hook client (ex: `use-auto-receipt-print.ts`) que, quando o toggle está ligado e chega
   um `order_status_changed` com `status === 'ready'`:
   - guarda o `orderId` num Set/localStorage `printedIds` (dedupe contra evento
     duplicado / reconexão);
   - injeta/reusa um `<iframe>` escondido com `src=/receipt/:id` e, no `onload`, chama
     `iframe.contentWindow.print()`.
   - Com Chrome rodando `--kiosk-printing` e a térmica como impressora padrão, imprime
     direto sem diálogo.
3. **Ops:** documentar no `DEPLOY.md`/README o setup do PC do balcão: iniciar Chrome com
   `--kiosk-printing`, impressora térmica como padrão, aba do kanban aberta com a
   "Estação de impressão" ligada.

**Notas:**
- Só imprime em evento novo; ao recarregar a aba, pedidos que já estavam `ready` não
  reimprimem (o guard + o fato de o socket só emitir na transição cobrem isso).
- Não altera o fluxo de status nem o backend; reusa página de comprovante + socket
  existentes.

**Alternativa considerada e descartada:** auto-emit server-side (gerar PDF / imprimir no
servidor) — exigiria nova stack de impressão/fiscal; o cliente já está satisfeito com o
cupom atual, só quer automatizar o disparo. YAGNI.

---

## Testes (Playwright, `tests/features/`)

Estender a suite existente:
- **F1:** reordenar 2 grupos no admin (drag) → recarrega → ordem persiste; opcional: menu
  do cliente reflete a ordem.
- **F2:** produto com combinado "Carnes" máx 2 → no cliente, após 2 carnes as opções dos
  dois grupos ficam desabilitadas; tentativa de pedido com 3 carnes via API retorna 400.
- **F3:** com toggle ligado, spy em `window.print` (ou no `print` do iframe) dispara ao
  receber evento `ready`; com toggle desligado, não dispara.

## Deploy

Fluxo padrão (ver `cardapio-web-deploy-git-flow` memory): push do clone local (gh
yanlimabarbosa HTTPS) → server `git fetch && reset --hard origin/master` → build api+web →
`migration:up` da imagem nova (F2 tem migração) → `up -d`. Backup `pg_dump` antes.
