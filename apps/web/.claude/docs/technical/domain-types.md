# Domain Types & API Contracts

## Rule: Define Once, Import Everywhere

Domain types (data shapes that represent real things — foods, exercises, mesocycles) must be defined **once** in `src/types/` and imported wherever needed. Never redefine the same type inline in multiple files.

## Directory Structure

```
src/types/
├── diet.ts          ← FoodItem, MealEntry, MacroValues, MacroTargets
├── workout.ts       ← Exercise, TrainingDay, PlannedExercise, SetLog, WorkoutSession
├── mesocycle.ts     ← Mesocycle, VolumeLandmark, WeekStats, CycleSummary
├── progress.ts      ← WeightLog
└── api/
    ├── dashboard.ts ← DashboardResponse
    ├── treino.ts    ← TreinoPageResponse
    └── sessions.ts  ← SessionDetailResponse
```

## Domain Types (`src/types/`)

One file per domain. Each file exports the types that represent that domain's entities.

```tsx
// types/diet.ts
export type FoodItem = {
  id: number;
  name: string;
  caloriesPer100g: number;
  proteinPer100g: number;
  carbPer100g: number;
  fatPer100g: number;
};

export type MacroValues = {
  calories: number;
  protein: number;
  carb: number;
  fat: number;
};

export type MacroTargets = {
  dailyCalories: number;
  proteinG: number;
  carbG: number;
  fatG: number;
};
```

### BAD — Same type defined in 3 files
```tsx
// food-search-dialog.tsx
type FoodItem = { id: number; name: string; caloriesPer100g: number; ... };

// food-search-results.tsx
type FoodItem = { id: number; name: string; caloriesPer100g: number; ... };

// alimentos/page.tsx
type Food = { id: number; name: string; caloriesPer100g: number; ... };
```

### GOOD — One definition, multiple imports
```tsx
// types/diet.ts
export type FoodItem = { ... };

// Any file that needs it:
import type { FoodItem } from '@/types/diet';
```

## API Contracts (`src/types/api/`)

API response types are shared between the API route (producer) and the consuming component (consumer). This catches shape mismatches at compile time.

```tsx
// types/api/dashboard.ts
import type { MacroValues, MacroTargets } from '../diet';

export type DashboardResponse = {
  date: string;
  targets: MacroTargets;
  todayMacros: MacroValues;
  latestWeight: number | null;
  latestWeightDate: string | null;
  previousWeight: number | null;
  mesocycle: {
    id: number;
    name: string;
    currentWeek: number;
    numWeeks: number;
    status: string;
  } | null;
  nextTrainingDay: { id: number; name: string } | null;
  allSessionsDone: boolean;
  userName: string;
};
```

### API route (producer)
```tsx
// app/api/dashboard/route.ts
import type { DashboardResponse } from '@/types/api/dashboard';

export async function GET() {
  // ... build data ...
  return NextResponse.json(data satisfies DashboardResponse);
}
```

### Server page (consumer)
```tsx
// app/page.tsx
import type { DashboardResponse } from '@/types/api/dashboard';

export default async function DashboardPage() {
  const res = await fetch(`${process.env.NEXT_PUBLIC_URL}/api/dashboard`, { ... });
  const data: DashboardResponse = await res.json();
  return <DashboardClient data={data} />;
}
```

### Client component (consumer)
```tsx
// components/dashboard-client/index.tsx
import type { DashboardResponse } from '@/types/api/dashboard';

type DashboardClientProps = {
  data: DashboardResponse;
};

export function DashboardClient({ data }: DashboardClientProps) { ... }
```

If the API route changes its shape, TypeScript catches it everywhere — in the route, the page, and the component.

## When to Use Domain Types vs Local Types

| Type | Where to define | Example |
|------|----------------|---------|
| Domain entity (represents a real thing) | `types/domain.ts` | `FoodItem`, `Exercise`, `Mesocycle` |
| API response shape | `types/api/endpoint.ts` | `DashboardResponse`, `TreinoPageResponse` |
| Component props | In the component file | `SetRowProps`, `WeightCardProps` |
| Internal component state | In the component file | `DialogState`, `Selection` |
| Hook return type | In the hook file (if simple) | Inline or named |

**Props types stay in their component file** — they're the component's public API, not a domain concept. Don't put `SetRowProps` in `types/`.

**Internal state types stay local** — discriminated unions for dialog state, selection state, etc. are implementation details.

## Naming Conventions

- Domain types: PascalCase noun — `FoodItem`, `WorkoutSession`, `VolumeLandmark`
- API response types: PascalCase with `Response` suffix — `DashboardResponse`, `SessionDetailResponse`
- Props types: `{ComponentName}Props` — stays in the component file
- Never use generic names like `Data`, `Item`, `Result`, `Info`

## Import Style

Always use `import type` for type-only imports:
```tsx
import type { FoodItem } from '@/types/diet';
import type { DashboardResponse } from '@/types/api/dashboard';
```

This makes it clear the import is erased at runtime and helps tree-shaking.
