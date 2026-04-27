# Hooks & Data Fetching Patterns

## No Inline useQuery/useMutation

NEVER use `useQuery`, `useMutation`, or `useInfiniteQuery` directly in a component file. Always wrap them in a custom hook inside `hooks/`.

### BAD — inline in component
```tsx
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/hooks/use-api";

export default function AlimentosPage() {
  const queryClient = useQueryClient();
  const { data: foods = [] } = useQuery<Food[]>({
    queryKey: ["foods", query],
    queryFn: () => apiFetch(`/api/alimentos?q=${query}`),
    staleTime: 30 * 1000,
  });
  const saveMutation = useMutation({
    mutationFn: (data) => apiFetch("/api/alimentos", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["foods"] }),
  });
}
```

### GOOD — custom hooks in hooks/
```tsx
// hooks/diet/use-foods.ts
export function useFoods(query: string) {
  return useQuery<Food[]>({
    queryKey: ["foods", query],
    queryFn: () => apiFetch(`/api/alimentos?q=${encodeURIComponent(query)}`),
    staleTime: 30 * 1000,
  });
}

// hooks/diet/use-save-food.ts
export function useSaveFood() 
  const qc = useQueryClient();
  return useMutation({ ... });
}

// component — clean imports, no React Query knowledge
import { useFoods } from "@/hooks/diet/use-foods";
import { useSaveFood } from "@/hooks/diet/use-save-food";

export default function AlimentosPage() {
  const { data: foods = [] } = useFoods(query);
  const saveMutation = useSaveFood();
}
```

Components should never import from `@tanstack/react-query` directly. All React Query usage lives in `hooks/`.

## One Hook Per File (Atomic Modules)

Every hook file exports exactly ONE query or mutation. The file name tells you what it does.

```
hooks/
├── use-api.ts                          ← shared fetch wrapper
├── use-debounce.ts                     ← shared debounce utility
├── config/
│   ├── use-macro-targets.ts            ← query: GET /api/metas
│   ├── use-update-macro-targets.ts     ← mutation: PUT /api/metas
│   ├── use-volume-landmarks.ts         ← query: GET /api/volume-landmarks
│   ├── use-update-volume-landmarks.ts  ← mutation: PUT /api/volume-landmarks
│   └── use-mesocycles.ts               ← query: GET /api/mesociclos
├── diet/
│   ├── use-meals.ts                    ← query: GET /api/refeicoes?date=
│   ├── use-templates.ts                ← query: GET /api/templates
│   ├── use-food-search.ts              ← query: GET /api/alimentos/search (paginated)
│   ├── use-food-search-infinite.ts     ← infinite query: GET /api/alimentos/search
│   ├── use-add-meal-entry.ts           ← mutation: POST /api/refeicoes
│   ├── use-delete-meal-entry.ts        ← mutation: DELETE /api/refeicoes/:id
│   ├── use-toggle-meal-completed.ts    ← mutation: PUT /api/refeicoes/:id (optimistic)
│   ├── use-apply-template.ts           ← mutation: POST /api/templates/apply
│   └── use-create-food.ts             ← mutation: POST /api/alimentos
├── plans/
│   ├── use-diet-plans.ts               ← query: GET /api/diet-plans (exports DietPlan type)
│   ├── use-save-day-as-plan.ts         ← mutation: POST /api/diet-plans/save-day
│   ├── use-set-active-plan.ts          ← mutation: PUT /api/diet-plans/:id
│   └── use-delete-plan.ts             ← mutation: DELETE /api/diet-plans/:id
├── progress/
│   ├── use-weight-history.ts           ← query: GET /api/peso
│   └── use-log-weight.ts              ← mutation: POST /api/peso
└── workout/
    ├── use-start-session.ts            ← mutation: POST /api/sessoes
    ├── use-finish-session.ts           ← mutation: PUT /api/sessoes/:id
    ├── use-delete-session.ts           ← mutation: DELETE /api/sessoes/:id
    ├── use-save-set.ts                 ← mutation: POST/PUT /api/sets
    └── use-delete-set.ts              ← mutation: DELETE /api/sets/:id
```

## Hook File Template

### Query Hook
```tsx
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "../use-api";

type ReturnType = { /* ... */ };

export function useMyQuery(param: string) {
  return useQuery<ReturnType>({
    queryKey: ["myQuery", param],
    queryFn: () => apiFetch(`/api/endpoint?param=${param}`),
    enabled: !!param,
    staleTime: 60 * 1000,
  });
}
```

### Mutation Hook
```tsx
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "../use-api";

export function useMyMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { /* ... */ }) =>
      apiFetch("/api/endpoint", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["relatedQuery"] });
    },
  });
}
```

## apiFetch Wrapper

All API calls go through `apiFetch` from `hooks/use-api.ts`. It:
- Adds `Content-Type: application/json` header
- Throws on non-OK responses (React Query catches these)
- Returns typed JSON

```tsx
import { apiFetch } from "@/hooks/use-api";

// Usage in hooks:
const data = await apiFetch<MyType>("/api/endpoint");
const result = await apiFetch("/api/endpoint", {
  method: "POST",
  body: JSON.stringify(payload),
});
```

## Optimistic Updates

Used in `use-toggle-meal-completed.ts` for instant UI feedback:
1. Cancel ongoing refetches
2. Snapshot previous data
3. Optimistically update cache
4. On error: rollback to snapshot
5. On settled: refetch for consistency

## Import Convention

Always import hooks by their full path — no barrel exports (index.ts):
```tsx
import { useMeals } from "@/hooks/diet/use-meals";
import { useLogWeight } from "@/hooks/progress/use-log-weight";
import { useMacroTargets } from "@/hooks/config/use-macro-targets";
```
