# File Naming & Organization Conventions

## Core Rule: File Name = What's Inside

Every file name should tell you exactly what it exports without opening it. One primary export per file.

## Naming Patterns

### Components: `{component-name}.tsx`
```
meal-section.tsx          ← MealSection component
food-search-dialog.tsx    ← FoodSearchDialog component (or folder: food-search-dialog/)
confirm-dialog.tsx        ← ConfirmDialog component
weight-chart.tsx          ← WeightChart component
```

### Hooks: `use-{action}-{entity}.ts`
```
use-meals.ts              ← query hook for meals
use-add-meal-entry.ts     ← mutation hook to add a meal entry
use-delete-session.ts     ← mutation hook to delete a session
use-food-search-infinite.ts ← infinite query hook for food search
```

### Constants: `{constant-name}.ts`
```
muscle-colors.ts          ← MUSCLE_COLORS constant
default-macros.ts         ← DEFAULT_MACROS constant
rir-options.ts            ← RIR_OPTIONS constant
day-labels.ts             ← DAY_LABELS constant
```

### Schemas: `{schema-name}.ts`
```
set-schema.ts             ← setSchema + SetFormData type
grams-schema.ts           ← gramsSchema + GramsFormData type
config-schema.ts          ← configSchema + ConfigFormData type
```

### Utilities: `{function-name}.ts`
```
calc-macros.ts            ← calcMacros function
get-bar-color.ts          ← getBarColor function
format-time.ts            ← formatTime function
get-week-dot-style.ts     ← getWeekDotStyle function
```

### Domain types: `{domain}.ts`
```
types/diet.ts             ← FoodItem, MacroValues, MacroTargets
types/workout.ts          ← Exercise, TrainingDay, WorkoutSession
types/api/dashboard.ts    ← DashboardResponse
```

## One Export Per File

Every file exports exactly one thing. The file name tells you what it is.

### BAD — Multiple exports in one file
```tsx
// helpers.ts
export function getBarColor() { ... }
export function getWarning() { ... }
export const FIELD_LABELS = { ... };
```

### GOOD — One export per file
```
utils/
├── get-bar-color.ts     ← export function getBarColor() { ... }
└── get-warning.ts       ← export function getWarning() { ... }
constants/
└── field-labels.ts      ← export const FIELD_LABELS = { ... }
```

**Exception:** A zod schema file can export both the schema and its inferred type since they're inherently coupled:
```tsx
// schemas/set-schema.ts
export const setSchema = z.object({ ... });
export type SetFormData = z.infer<typeof setSchema>;
```

## File Order Within a Component

Every component file follows this top-to-bottom order. The principle: dependencies first, then the main thing, then helpers.

```tsx
// 1. Imports
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { useMeals } from "@/hooks/diet/use-meals";

// 2. Types (props types, local types)
type MealSectionProps = {
  mealName: string;
  entries: MealEntry[];
};

// 3. Constants and Schemas (static values the component depends on)
const RIR_OPTIONS = [0, 1, 2, 3, 4, 5];

const setSchema = z.object({
  weight: z.number().positive(),
  reps: z.number().int().positive(),
  rir: z.number().min(0).max(5),
});

type SetFormData = z.infer<typeof setSchema>;

// 4. Exported component (THE main thing)
export function MealSection({ mealName, entries }: MealSectionProps) {
  // ...component body...
  const macros = calcEntryMacros(entry); // can reference utils below (hoisted)
  return <div>...</div>;
}

// 5. Utility functions (helpers used by the component above)
function calcEntryMacros(entry: MealEntry) {
  return { cal: Math.round(...), prot: Math.round(...) };
}

function getDayCardClass(isCompleted: boolean, isNext: boolean) {
  if (isCompleted) return "border-emerald-500/20";
  return "border-white/[0.06]";
}
```

### Why this order

- **Types/constants/schemas first** — they're the component's contract and configuration. When you open a file, you immediately see what data shapes it works with.
- **Component in the middle** — the main export, the thing you came to read.
- **Utils at the bottom** — implementation details. JavaScript function declarations are hoisted, so the component can reference functions defined below it. Use `function` declarations (not `const` arrow functions) for utils so hoisting works.

### BAD — utils above component, schema scattered
```tsx
function calcMacros() { ... }        // util buried above
const LABELS = { ... };              // constant mixed in
export function MyComponent() { ... } // component lost in the middle
const schema = z.object({ ... });    // schema after component
```

### GOOD — clean top-to-bottom reading
```tsx
type MyComponentProps = { ... };      // types first
const LABELS = { ... };              // constants second
const schema = z.object({ ... });    // schemas second
export function MyComponent() { ... } // THE component
function calcMacros() { ... }        // utils last
```

## Component Files vs Component Folders

A component is a **single file** when it has no dependencies (no sub-components, no utils, no constants, no schemas):
```
components/shared/
├── confirm-dialog.tsx
├── empty-state.tsx
└── loading-spinner.tsx
```

A component becomes a **folder** when it has sub-components:
```
components/treino/set-row/
├── index.tsx              ← SetRow + inline schema + inline constant
└── locked-actions.tsx     ← LockedActions sub-component
```

See [component-folder-structure.md](component-folder-structure.md) for the full pattern.

## Folder Grouping Rules

### When to group into a domain folder
- 3+ related files → create a domain folder
- Files share a clear domain (diet, workout, config, etc.)

### When to keep at root
- Single-purpose utility used across all domains (utils.ts, use-api.ts)
- No clear domain affiliation

### Domain folders in hooks/
```
hooks/config/     ← macro targets, volume landmarks, mesocycles
hooks/diet/       ← meals, templates, food search, entries
hooks/plans/      ← diet plans CRUD
hooks/progress/   ← weight tracking
hooks/workout/    ← sessions, sets
```

### Domain folders in lib/
```
lib/constants/    ← app-wide constants (colors, labels, defaults)
lib/macros/       ← macro calculation and display utilities
lib/date/         ← date formatting utilities
```

### Domain folders in types/
```
types/            ← domain entity types (diet, workout, mesocycle, progress)
types/api/        ← API response contracts (dashboard, treino, sessions)
```

## Feature Components: `_components/`

Page-specific components live in `_components/` next to their page:
```
app/dieta/
├── _components/
│   ├── date-nav.tsx                  ← simple component (single file)
│   ├── food-search-dialog/           ← complex component (folder)
│   │   ├── index.tsx
│   │   ├── food-search-content.tsx
│   │   └── ...
│   ├── meal-section/
│   │   ├── index.tsx
│   │   └── utils/
│   │       └── calc-entry-macros.ts
│   ├── save-plan-dialog.tsx
│   ├── new-meal-dialog.tsx
│   ├── macro-summary-bar.tsx
│   └── use-dieta-page.ts            ← page orchestrator hook
└── page.tsx
```

- Underscore prefix (`_`) tells Next.js it's not a route
- Only components used by THIS page go here
- If a component is used by 2+ pages, move it to `components/shared/`

## Props Type Naming

Name props types after the component, not generic `Props`. The props type lives in the same file as the component.

```tsx
// BAD
type Props = { totals: MacroTotals };
export function MacroSummaryBar({ totals }: Props) { ... }

// GOOD
type MacroSummaryBarProps = { totals: MacroTotals };
export function MacroSummaryBar({ totals }: MacroSummaryBarProps) { ... }
```

Pattern: `{ComponentName}Props`.

## No Comments

Code should be self-explanatory. Do not add comments unless they explain a non-obvious business rule.

### Remove these
```tsx
{/* Header */}
{/* Weight Card */}
// --- Actions ---
// --- React Query ---
```

### Keep only these (business rules that aren't obvious from code)
```tsx
// RIR 5 = deload week, lower intensity by design
// TACO database uses per-100g values, Open Food Facts may vary
```

If you need a comment to explain what the code does, the code is too complex — refactor it instead.

## Import Style

### From outside a component folder
```tsx
// Resolves to food-search-dialog/index.tsx — this is NOT a barrel import
import { FoodSearchDialog } from './_components/food-search-dialog';
import { SetRow } from '@/components/treino/set-row';
```

### Full paths for non-folder modules
```tsx
import { useMeals } from '@/hooks/diet/use-meals';
import { DEFAULT_MACROS } from '@/lib/constants/default-macros';
import { macroStatus } from '@/lib/macros/macro-status';
import type { FoodItem } from '@/types/diet';
```

### BAD — barrel exports that just re-export
```tsx
// hooks/diet/index.ts — DON'T create these
export { useMeals } from './use-meals';
export { useAddMealEntry } from './use-add-meal-entry';

// consumer — hides where things live
import { useMeals } from '@/hooks/diet';
```

**The distinction:** `food-search-dialog/index.tsx` contains the actual `FoodSearchDialog` component. `hooks/diet/index.ts` would be an empty barrel re-exporting from siblings. The first is a component, the second is indirection. Only the first is allowed.
