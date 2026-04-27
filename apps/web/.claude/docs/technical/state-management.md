# State Management Patterns

## Principle: Derived State Over useState+useEffect

NEVER sync server data into local state with useEffect. Compute values directly.

### BAD — useState+useEffect sync
```tsx
const [targets, setTargets] = useState(defaults);
const { data: macroData } = useMacroTargets();
useEffect(() => {
  if (macroData) setTargets(macroData);
}, [macroData]);
```

### GOOD — Derived state
```tsx
const { data: macroData } = useMacroTargets();
const targets = macroData ?? defaults;
```

### GOOD — Form with local override (for editable forms)
When users need to edit server data locally before saving:
```tsx
const { data: macroData } = useMacroTargets();
const [localTargets, setLocalTargets] = useState<Targets | null>(null);

// Derived: local edits take priority, then server data, then defaults
const targets = localTargets ?? macroData ?? DEFAULT_MACROS;

async function save() {
  await updateMacros.mutateAsync(targets);
  setLocalTargets(null); // Reset — React Query cache now has saved values
}
```

## Principle: State Colocation

Keep state close to where it's used. Dialogs own their own form state.

### BAD — Parent owns dialog state
```tsx
// In parent: 15+ useState for multiple dialogs
const [searchInput, setSearchInput] = useState("");
const [selectedFood, setSelectedFood] = useState(null);
const [grams, setGrams] = useState("");
const [savePlanName, setSavePlanName] = useState("");
const [deleteMealTarget, setDeleteMealTarget] = useState("");
// ... more dialog state
```

### GOOD — Each dialog owns its state
```tsx
// Parent only controls open/close
const [addMealName, setAddMealName] = useState<string | null>(null);

<FoodSearchDialog
  open={addMealName !== null}
  onOpenChange={(open) => { if (!open) setAddMealName(null); }}
  mealName={addMealName ?? ""}
  dateStr={dateStr}
/>

// Inside FoodSearchDialog — owns its own form state:
const [searchInput, setSearchInput] = useState("");
const debouncedQuery = useDebounce(searchInput, 300);
const [selectedFood, setSelectedFood] = useState(null);
const [grams, setGrams] = useState("");
```

## Principle: Consolidated Dialog State

When a page has multiple dialogs, use a discriminated union instead of multiple booleans.

### BAD — Multiple boolean states
```tsx
const [savePlanOpen, setSavePlanOpen] = useState(false);
const [newMealOpen, setNewMealOpen] = useState(false);
const [deleteMealOpen, setDeleteMealOpen] = useState(false);
const [deleteMealTarget, setDeleteMealTarget] = useState("");
```

### GOOD — Discriminated union
```tsx
type DialogState =
  | { type: "newMeal" }
  | { type: "savePlan" }
  | { type: "deleteMeal"; target: string }
  | null;

const [dialog, setDialog] = useState<DialogState>(null);

// Usage:
<ConfirmDialog open={dialog?.type === "deleteMeal"} ... />
<SavePlanDialog open={dialog?.type === "savePlan"} ... />
<NewMealDialog open={dialog?.type === "newMeal"} ... />
```

## Principle: useDebounce Hook

Use the `useDebounce` hook instead of manual setTimeout+useEffect.

### BAD — Manual debounce
```tsx
const [searchInput, setSearchInput] = useState("");
const [debouncedQuery, setDebouncedQuery] = useState("");
useEffect(() => {
  const timer = setTimeout(() => setDebouncedQuery(searchInput), 300);
  return () => clearTimeout(timer);
}, [searchInput]);
```

### GOOD — useDebounce hook
```tsx
const [searchInput, setSearchInput] = useState("");
const debouncedQuery = useDebounce(searchInput, 300);
```

## Principle: Minimal State Shape

Track the simplest possible shape. If you only need names, don't clone a full data structure.

### BAD — Cloning a full object to track partial info
```tsx
type MealsData = { meals: Record<string, MealEntry[]>; mealOrder: string[]; totals: ...; totalEntries: number; completedCount: number };

const [localMeals, setLocalMeals] = useState<MealsData | null>(null);

// Now you need a 15-line merge function to combine server + local:
function mergeMeals(serverData, localData) { ... }
```

### GOOD — Track only what's actually local
```tsx
// All we're tracking locally is "extra empty meal section names"
const [localMealNames, setLocalMealNames] = useState<string[]>([]);

// Merging is a one-liner:
const mealNames = [...serverNames, ...localMealNames.filter(n => !serverNames.includes(n))];
```

Ask: "what's the minimum state I need to reconstruct the UI?" If server data already has 90% of what you need, don't clone it — just track the delta.

## Principle: Leaf Components Fetch Their Own Data

If a component always needs certain data and nothing else uses it at the same level, let the component fetch it internally instead of threading props from above.

### BAD — Parent fetches data just to pass it down
```tsx
// Parent hook
const { data: targets } = useMacroTargets();  // only MacroSummaryBar needs this
return { targets, ... };

// Parent page
<MacroSummaryBar totals={totals} targets={page.targets} />
```

### GOOD — Leaf component fetches its own data
```tsx
// MacroSummaryBar fetches what it needs
export function MacroSummaryBar({ totals }: { totals: MacroTotals }) {
  const { data: macroData } = useMacroTargets();
  const targets = macroData ?? DEFAULT_MACROS;
  return <MacroGrid current={totals} target={targets} compact />;
}
```

This removes a hook from the parent, removes a prop, and colocates data with the component that uses it. React Query deduplicates the request, so there's no performance cost.

## Principle: Extract Side-Effect Logic Into Hooks

Complex side-effect chains (auto-fill, sync, polling) should be their own hook — not tangled into the page hook.

### BAD — Side effects mixed with page state
```tsx
export function useDietaPage() {
  // ... 5 useState, 6 data hooks ...
  const autoFillAttempted = useRef("");
  const tryAutoFill = useCallback(async () => { ... 25 lines ... }, [deps]);
  useEffect(() => { if (mealsData) tryAutoFill(mealsData); }, [mealsData, tryAutoFill]);
  // ... actions, derived state ...
}
```

### GOOD — Side effect is its own hook
```tsx
// use-auto-fill.ts — single responsibility: fill empty days
export function useAutoFill(dateStr, mealsData, setLocalMealNames) {
  const attempted = useRef("");
  const { data: templates } = useTemplates();      // fetches its own data
  const applyTemplate = useApplyTemplate();         // owns its own mutation
  useEffect(() => { ... clear on date change ... }, [dateStr]);
  useEffect(() => { ... try auto-fill ... }, [mealsData]);
}

// use-dieta-page.ts — clean, no refs, no effects
export function useDietaPage() {
  const [localMealNames, setLocalMealNames] = useState<string[]>([]);
  useAutoFill(dateStr, mealsData, setLocalMealNames);  // fire and forget
  // ... just state + actions, no side-effect logic
}
```

The page hook drops from 185 → 85 lines, loses all useEffect/useCallback/useRef, and the auto-fill logic is testable in isolation.

## Principle: No Wrapper Functions

Don't create functions that just call a setter. Expose the setter directly.

### BAD — Pointless wrappers
```tsx
function openFoodSearch(name: string) { setFoodSearchMeal(name); }
function closeFoodSearch() { setFoodSearchMeal(null); }
function openDialog(state: DialogState) { setDialog(state); }
function closeDialog() { setDialog(null); }
return { openFoodSearch, closeFoodSearch, openDialog, closeDialog };
```

### GOOD — Expose setters directly
```tsx
return { foodSearchMeal, setFoodSearchMeal, dialog, setDialog };
```

Only create a named function when it does more than one thing (e.g., `removeMealSection` deletes entries AND updates local state).

## Principle: React Hook Form + Zod for Forms

All forms must use **react-hook-form** for state management and **zod** for validation. Never use raw `useState` for form fields.

### BAD — Manual form state with useState
```tsx
const [form, setForm] = useState({ name: "", caloriesPer100g: "", proteinPer100g: "" });

<Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
<Input value={form.caloriesPer100g} onChange={(e) => setForm({ ...form, caloriesPer100g: e.target.value })} />

async function save() {
  const body = {
    name: form.name,
    caloriesPer100g: parseFloat(form.caloriesPer100g),  // manual parsing
  };
  await mutation.mutateAsync(body);
}
```

### GOOD — React Hook Form + Zod
```tsx
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const foodSchema = z.object({
  name: z.string().min(1, "Nome obrigatorio"),
  caloriesPer100g: z.number().min(0),
  proteinPer100g: z.number().min(0),
  carbPer100g: z.number().min(0),
  fatPer100g: z.number().min(0),
});

type FoodFormData = z.infer<typeof foodSchema>;

const { register, handleSubmit, reset, formState: { errors } } = useForm<FoodFormData>({
  resolver: zodResolver(foodSchema),
});

<Input {...register("name")} />
<Input type="number" {...register("caloriesPer100g", { valueAsNumber: true })} />

<form onSubmit={handleSubmit(async (data) => {
  await mutation.mutateAsync(data);  // already typed and validated
  reset();
})}>
```

**Important: Use `z.number()` (not `z.coerce.number()`) with `{ valueAsNumber: true }` in register.** Zod v4's `z.coerce.number()` infers `unknown` as the input type, which causes type errors with `@hookform/resolvers`. The `valueAsNumber` option in RHF's `register()` handles the string-to-number conversion from HTML inputs instead.

Benefits:
- No manual `parseFloat` / type coercion — RHF's `valueAsNumber` handles it
- Validation built in — errors display automatically
- No useState for form fields — react-hook-form manages everything
- `reset()` clears form cleanly
- Type-safe: `data` in `handleSubmit` matches the zod schema exactly

## File-Level Rules

- Max 5 useState calls per component/hook
- Max 250 lines per file
- If a hook needs more than 3 useEffect/useCallback, split side effects into sub-hooks
- React Query for all server state — no manual fetch + useState
- Leaf components can fetch their own data when it simplifies the parent
- React Hook Form + Zod for all forms — never useState for form fields
