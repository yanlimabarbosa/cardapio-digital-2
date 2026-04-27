# Component Patterns

## Page = Pure UI Shell

A page component should be a **thin UI shell** — zero logic, zero hooks, just JSX composition. All data fetching, state, mutations, and business logic live in a **colocated custom hook**.

### The Pattern

```
_components/
├── use-dieta-page.ts    ← custom hook: ALL state, hooks, logic, actions
├── empty-day.tsx         ← UI component
├── meal-section/         ← UI component (folder — has sub-components/utils)
│   ├── index.tsx
│   └── utils/
│       └── calc-entry-macros.ts
└── ...
page.tsx                  ← pure UI shell: calls hook, renders components
```

### Page Rules (the UI shell)
- **Zero useState, zero useEffect, zero useCallback** — the page has none
- Calls ONE custom hook that returns everything it needs
- Only contains JSX composition — no logic, no calculations
- Max ~100 lines
- Destructures data + actions from the hook

### Custom Hook Rules (`use-xxx-page.ts`)
- Lives in `_components/` next to its page
- Contains ALL useState, useEffect, useCallback, useRef
- Contains ALL data-fetching hooks (useQuery, useMutation)
- Contains ALL business logic (auto-fill, merging, validation)
- Returns a clean interface: `{ data, actions }` — the page never knows how things work internally

### Feature Component Rules
- **One component per file** — if a function returns JSX, it's its own file (see [component-folder-structure.md](component-folder-structure.md))
- Max ~250 lines per file
- Single responsibility (one UI section or one dialog)
- Receives data via props
- Owns its OWN internal UI state (dialog open, form inputs, etc.)

### Example: dieta/page.tsx

```
page.tsx (UI shell, 85 lines — zero hooks)
│   calls useDietaPage() → gets everything
│
├── DateNav          ← date picker with nav arrows
├── EmptyDay         ← quick-create meal buttons (empty state)
├── MealSection      ← single collapsible meal with entries
├── FoodSearchDialog ← search + add food (owns search state internally)
├── SavePlanDialog   ← save day as plan (owns form state internally)
├── NewMealDialog    ← create new meal section
├── MacroSummaryBar  ← sticky bottom macro totals
└── ConfirmDialog    ← shared: delete meal confirmation

use-dieta-page.ts (185 lines — ALL the logic)
├── 5 useState, 2 useEffect, useCallback, useRef
├── 6 data hooks (useMeals, useMacroTargets, useTemplates, ...)
├── Auto-fill logic (template → previous day fallback)
├── Meal merging (server + local overlay)
└── Returns: { data, dialog, actions }
```

## JSX Reads, Never Computes

All JavaScript logic (calculations, conditionals, data transforms) must live **above the return**. JSX should only reference pre-computed values — never compute them inline.

### BAD — Logic inside JSX
```tsx
return (
  <div>
    {items.map((item) => {
      const cal = Math.round((item.caloriesPer100g * item.grams) / 100);
      const prot = Math.round((item.proteinPer100g * item.grams) / 100);
      const color = cal > 500 ? "text-rose-400" : "text-emerald-400";
      return (
        <p className={color}>{cal} kcal · {prot}g prot</p>
      );
    })}

    {(() => {
      const diff = weights[weights.length - 1] - weights[0];
      const isLoss = diff < 0;
      return <span className={isLoss ? "text-emerald-400" : "text-rose-400"}>{diff}</span>;
    })()}

    <div className={`rounded-full ${
      status === "completed" ? "bg-emerald-500/20 text-emerald-400"
      : isCurrent ? "bg-emerald-500 text-black"
      : "bg-white/[0.06] text-zinc-600"
    }`}>
  </div>
);
```

### GOOD — Logic above return, JSX only reads
```tsx
import { calcEntryMacros } from './utils/calc-entry-macros';
import { getWeekDotStyle } from './utils/get-week-dot-style';

const weightDiff = getWeightDiff(weights);
const diffColor = weightDiff.isLoss ? "text-emerald-400" : "text-rose-400";
const dotStyle = getWeekDotStyle(index, mesocycle);

return (
  <div>
    {items.map((item) => {
      const { cal, prot } = calcEntryMacros(item);
      return <p>{cal} kcal · {prot}g prot</p>;
    })}
    <span className={diffColor}>{weightDiff.value}</span>
    <div className={dotStyle}>
  </div>
);
```

**Key difference from before:** utility functions no longer live "above the return" in the same file — they live in `utils/` and are imported. The component file contains only the component.

### What to extract

| Inline pattern | Extract to |
|---|---|
| IIFE `{(() => { ... })()}` | Named variable or sub-component file |
| `.map()` with 3+ local variables | Utility function in `utils/` or sub-component |
| `.reduce()` / `.filter()` in JSX | Named variable before return |
| Multi-level className ternary | `utils/get-xxx-style.ts` |
| Inline `Math.round(x * y / 100)` | `utils/calc-xxx.ts` |
| Conditional message/color logic | `utils/get-xxx-feedback.ts` returning `{ color, message }` |

### Where extracted functions live

```
volume-bars/
├── index.tsx                      ← imports from utils/
└── utils/
    ├── get-bar-color.ts           ← getBarColor(display, lm): string
    └── get-warning.ts             ← getWarning(actual, lm): { text, color }
```

Every pure function that doesn't return JSX goes to `utils/`. One function per file, file name = function name in kebab-case.

---

## Shared Components (components/shared/)

Built with CVA (class-variance-authority) + cn patterns matching shadcn/ui style.

### ConfirmDialog
Reusable confirmation dialog with variants.
```tsx
<ConfirmDialog
  open={open}
  onOpenChange={setOpen}
  title="Remover refeicao?"
  description="Todos os alimentos serao removidos."
  onConfirm={handleDelete}
  variant="danger"   // "danger" = red button, "default" = emerald
  loading={isPending}
/>
```

### EmptyState
Icon + message + optional action button.
```tsx
<EmptyState
  icon={<UtensilsCrossed className="size-10" />}
  title="Nenhuma refeicao"
  description="Adicione sua primeira refeicao"
  action={{ label: "Adicionar", onClick: handleAdd }}
/>
```

### StatCard
Label + big number + optional subtitle with color variants.
```tsx
<StatCard label="RIR ALVO" value={4} subtitle="Real: 2.8" variant="warning" />
```

### MacroGrid / MacroBar
Macro progress display with automatic color status (on/under/over target).
```tsx
<MacroGrid
  current={{ calories: 1200, protein: 120, carb: 80, fat: 40 }}
  target={{ dailyCalories: 1735, proteinG: 175, carbG: 122, fatG: 58 }}
  compact    // compact = 4-col sticky bar, default = 2-col card grid
/>
```

### LoadingSpinner
Standardized spinner with size variants (sm/md/lg).
```tsx
<LoadingSpinner size="lg" />
```

### PageHeader
Oswald uppercase heading with optional actions slot.
```tsx
<PageHeader title="Dieta" actions={<Link>Alimentos</Link>} />
```

### CollapsibleCard
Card with expand/collapse animation (framer motion).

### MuscleBadge
Colored muscle group badge using MUSCLE_COLORS from constants.
```tsx
<MuscleBadge muscle="chest" />
```
