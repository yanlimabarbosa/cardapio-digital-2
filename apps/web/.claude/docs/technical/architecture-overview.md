# Architecture Overview

## Pattern: Screaming Architecture + Atomic Modules

The codebase follows **screaming architecture** — the file and folder structure tells you exactly what each file does without opening it. Combined with **one-export-per-file** (atomic modules), every file name maps directly to its single responsibility.

## Core Rule: One Component Per File

If a function returns JSX, it is a component and lives in its own file — zero exceptions. When a component has sub-components, constants, schemas, or utility functions, the file becomes a **folder** with `index.tsx` as the main component and siblings for everything else. See [component-folder-structure.md](component-folder-structure.md) for the full pattern.

## Directory Structure

```
src/
├── app/                              ← Next.js App Router (each route IS a feature folder)
│   ├── _components/                  ← page-specific components for app/page.tsx
│   │   └── dashboard-client/         ← folder component (has sub-components + utils)
│   │       ├── index.tsx
│   │       ├── mesocycle-card.tsx
│   │       ├── mesocycle-action.tsx
│   │       ├── weight-card.tsx
│   │       ├── weight-dialog.tsx
│   │       └── utils/
│   │           └── get-week-dot-style.ts
│   ├── dieta/
│   │   ├── _components/
│   │   │   ├── date-nav.tsx           ← simple component (single file)
│   │   │   ├── food-search-dialog/    ← folder component (has sub-components)
│   │   │   │   ├── index.tsx
│   │   │   │   ├── food-search-content.tsx
│   │   │   │   ├── food-detail.tsx
│   │   │   │   ├── macro-preview.tsx
│   │   │   │   ├── search-results.tsx
│   │   │   │   ├── food-row.tsx
│   │   │   │   ├── search-skeleton.tsx
│   │   │   │   ├── types.ts
│   │   │   │   └── schemas/
│   │   │   │       └── grams-schema.ts
│   │   │   ├── meal-section/          ← folder component (has utils)
│   │   │   │   ├── index.tsx
│   │   │   │   └── utils/
│   │   │   │       └── calc-entry-macros.ts
│   │   │   └── ...
│   │   ├── page.tsx
│   │   ├── planos/
│   │   └── alimentos/
│   ├── treino/
│   │   ├── _components/
│   │   │   └── training-day-list/     ← folder component
│   │   │       ├── index.tsx
│   │   │       ├── training-day-card.tsx
│   │   │       ├── constants/
│   │   │       │   └── day-labels.ts
│   │   │       └── utils/
│   │   │           └── get-day-card-class.ts
│   │   └── sessao/[id]/
│   │       ├── _components/
│   │       └── page.tsx
│   ├── mesociclo/
│   │   ├── _components/
│   │   └── mesociclo-client.tsx
│   ├── progresso/
│   │   ├── _components/
│   │   └── page.tsx
│   └── config/
│       └── page.tsx
├── components/
│   ├── shared/                       ← app-wide reusable components
│   │   ├── confirm-dialog.tsx         ← simple (stays as single file)
│   │   ├── empty-state.tsx
│   │   ├── loading-spinner.tsx
│   │   ├── macro-bar.tsx
│   │   ├── macro-grid.tsx
│   │   ├── muscle-badge.tsx
│   │   ├── page-header.tsx
│   │   ├── stat-card.tsx
│   │   └── collapsible-card.tsx
│   ├── treino/
│   │   ├── set-row/                   ← folder component
│   │   │   ├── index.tsx
│   │   │   ├── locked-actions.tsx
│   │   │   ├── constants/
│   │   │   │   └── rir-options.ts
│   │   │   └── schemas/
│   │   │       └── set-schema.ts
│   │   ├── rest-timer/                ← folder component (has utils)
│   │   │   ├── index.tsx
│   │   │   └── utils/
│   │   │       ├── format-time.ts
│   │   │       └── get-timer-text-color.ts
│   │   └── rest-timer-provider.tsx    ← single file (no sub-components)
│   ├── ui/                           ← shadcn primitives (don't modify)
│   ├── layout/
│   └── providers/
├── hooks/                            ← one hook per file, grouped by domain
│   ├── use-api.ts
│   ├── use-debounce.ts
│   ├── config/
│   ├── diet/
│   ├── plans/
│   ├── progress/
│   └── workout/
├── types/                            ← domain types + API contracts
│   ├── diet.ts
│   ├── workout.ts
│   ├── mesocycle.ts
│   ├── progress.ts
│   └── api/
│       ├── dashboard.ts
│       ├── treino.ts
│       └── sessions.ts
└── lib/                              ← one export per file, grouped by domain
    ├── utils.ts
    ├── auth.ts
    ├── prisma.ts
    ├── constants/                     ← app-wide constants
    │   ├── muscle-colors.ts
    │   ├── day-labels.ts
    │   ├── default-macros.ts
    │   └── default-meal-names.ts
    ├── date/
    └── macros/
```

## Key Decisions

1. **Feature folders = route directories** — In Next.js App Router, each route directory IS the feature folder. Page-specific components live in `_components/` (underscore prefix tells Next.js it's not a route).

2. **Shared components in `components/shared/`** — Only truly reusable components go here. If a component is only used by one page, it belongs in that page's `_components/` folder.

3. **Domain-grouped hooks** — Hooks are grouped by domain (diet, plans, workout, progress, config). Shared utilities (use-api, use-debounce) stay at the hooks root.

4. **Domain-grouped lib** — Constants, macros, and date utilities are split into domain folders with one export per file.

5. **Single-purpose root files** — Files that serve a single purpose and don't belong to a domain (utils.ts, auth.ts, prisma.ts) stay at the lib root.

6. **Centralized types** — Domain types live in `src/types/`, API contracts in `src/types/api/`. See [domain-types.md](domain-types.md).

7. **Component folders** — Complex components become folders with `index.tsx` + siblings. Simple components stay as single files. See [component-folder-structure.md](component-folder-structure.md).

8. **Page-specific components stay colocated** — `dashboard-client/` belongs in `app/_components/`, not in `components/`. Only truly shared components live in `components/shared/`.
