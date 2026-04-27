# Loading & Streaming Pattern

## Why This Matters

Without proper streaming, page transitions feel **stiff** — the user clicks a link, sees nothing for 500ms-2s, then the entire page pops in. This is the #1 reason Next.js apps feel sluggish despite being fast. The fix is simple: `loading.tsx` files that show instant skeletons while content streams in.

## Rule: Every Route Gets a loading.tsx

Every route directory with a `page.tsx` MUST have a `loading.tsx` file. No exceptions. This is the single biggest UX improvement for perceived performance.

```
app/
├── loading.tsx           ← dashboard skeleton
├── page.tsx
├── dieta/
│   ├── loading.tsx       ← dieta skeleton
│   ├── page.tsx
│   ├── planos/
│   │   ├── loading.tsx   ← planos skeleton
│   │   └── page.tsx
│   └── alimentos/
│       ├── loading.tsx   ← alimentos skeleton
│       └── page.tsx
├── treino/
│   ├── loading.tsx       ← treino skeleton
│   ├── page.tsx
│   └── sessao/[id]/
│       ├── loading.tsx   ← session skeleton
│       └── page.tsx
└── ...
```

## How It Works

Under the hood, Next.js wraps every `page.tsx` in a `<Suspense>` boundary:

```tsx
// What Next.js does internally:
<Suspense fallback={<Loading />}>
  <Page />
</Suspense>
```

The `loading.tsx` export becomes the fallback. It shows **instantly** during route transitions — no JS needed, no data needed, pure server-rendered HTML.

### Server Component Pages (dashboard, treino, mesociclo)

```
User clicks link
  → loading.tsx shows INSTANTLY (skeleton)
  → Server fetches data (Prisma queries, API calls)
  → Page streams in, replaces skeleton
```

The Suspense catches the async data fetch. The skeleton shows while the server does its work.

### Client Component Pages (dieta, config, progresso)

Client pages need a **server wrapper** so `loading.tsx` can work:

```
dieta/
├── loading.tsx                    ← skeleton (server component)
├── page.tsx                       ← thin server wrapper (NO "use client")
└── _components/
    └── dieta-client.tsx           ← actual page logic ("use client")
```

```tsx
// page.tsx — server wrapper, NOT a client component
import { DietaClient } from "./_components/dieta-client";

export default function DietaPage() {
  return <DietaClient />;
}
```

```tsx
// _components/dieta-client.tsx — all hooks and interactivity
"use client";

export function DietaClient() {
  const page = useDietaPage();
  // ... all the interactive UI
}
```

```
User clicks link
  → loading.tsx shows INSTANTLY (skeleton)
  → JS bundle for DietaClient loads
  → Component hydrates, React Query fires
  → Data arrives, skeleton replaced by content
```

**Why the wrapper matters:** If `page.tsx` itself is `"use client"`, Next.js can't show `loading.tsx` during the route transition — it has to wait for the client JS to load first. The server wrapper lets the skeleton stream immediately while the client bundle loads in parallel.

## Skeleton Design Rules

Skeletons must match the real page layout so the transition feels like content "filling in" rather than a layout shift.

```tsx
// loading.tsx
export default function Loading() {
  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-4 px-4 pt-6">
      {/* Match the real page's container exactly */}

      {/* Title skeleton — same height as real h1 */}
      <div className="h-8 w-40 animate-pulse rounded-lg bg-white/[0.06]" />

      {/* Card skeleton — same border, radius, padding as real card */}
      <div className="rounded-xl border border-white/[0.06] bg-card p-4">
        <div className="h-4 w-24 animate-pulse rounded bg-white/[0.06]" />
        <div className="mt-3 h-8 w-32 animate-pulse rounded bg-white/[0.08]" />
      </div>
    </div>
  );
}
```

### Do:
- Use `animate-pulse` with `bg-white/[0.06]` or `bg-white/[0.08]`
- Match the real page's `max-w-lg`, `px-4`, `pt-6`, `gap-4`
- Match card borders: `rounded-xl border border-white/[0.06] bg-card`
- Match approximate heights of real content blocks
- Keep it simple — gray pulsing blocks, no logic

### Don't:
- Use `LoadingSpinner` for page-level loading (that's for button/action loading)
- Add `"use client"` to loading.tsx — it must be a server component
- Over-detail the skeleton — rough shapes are fine, pixel-perfect isn't needed
- Add state, hooks, or interactivity to loading.tsx

## Client-Side Loading (React Query)

For client components that fetch data via React Query, the `isLoading` state should show **inline skeletons**, not spinners. The page shell is already visible (rendered by the server wrapper), so only the data-dependent sections need loading states.

### BAD — spinner for data loading
```tsx
{isLoading && <LoadingSpinner size="lg" />}
```

### GOOD — inline skeleton matching the content shape
```tsx
{isLoading && (
  <div className="flex flex-col gap-3">
    {[1, 2, 3].map((i) => (
      <div key={i} className="rounded-xl border border-white/[0.06] bg-card p-4">
        <div className="h-5 w-28 animate-pulse rounded bg-white/[0.08]" />
        <div className="mt-3 h-10 animate-pulse rounded-lg bg-white/[0.04]" />
      </div>
    ))}
  </div>
)}
```

## Summary

| Layer | What shows | When | Component type |
|-------|-----------|------|---------------|
| `loading.tsx` | Route skeleton | During navigation, before page mounts | Server component |
| React Query `isLoading` | Inline data skeleton | After mount, while fetching data | Inside client component |
| `isPending` on mutations | Button spinner/disabled | During save/delete actions | Inside client component |

Three layers, each handles a different moment. Together they make the app feel instant — no blank screens, no layout shifts, no stiffness.
