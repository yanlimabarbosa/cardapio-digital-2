# Data Access Patterns

## Rule: No Direct Database Calls — Always Go Through API Routes

NEVER import Prisma or call the database directly from components, pages, or server components. All data access must go through `/api` routes, treating them as a separated backend.

### BAD — Direct database call in server component
```tsx
// app/mesociclo/page.tsx (server component)
import { prisma } from "@/lib/prisma";

export default async function MesocicloPage() {
  const mesocycle = await prisma.mesocycle.findFirst({ where: { status: "active" } });
  return <MesocicloClient data={mesocycle} />;
}
```

### BAD — Direct database call in server action
```tsx
"use server";
import { prisma } from "@/lib/prisma";

export async function getMesocycle(id: number) {
  return prisma.mesocycle.findUnique({ where: { id } });
}
```

### GOOD — Server component fetches through API route
```tsx
// app/mesociclo/page.tsx (server component)
export default async function MesocicloPage() {
  const res = await fetch(`${process.env.NEXT_PUBLIC_URL}/api/mesociclos?status=active`, {
    headers: { cookie: cookies().toString() },
  });
  const mesocycle = await res.json();
  return <MesocicloClient data={mesocycle} />;
}
```

### GOOD — Client component uses custom hook → API route
```tsx
// hooks/config/use-mesocycles.ts
export function useMesocycles() {
  return useQuery({
    queryKey: ["mesocycles"],
    queryFn: () => apiFetch("/api/mesociclos"),
  });
}

// component
import { useMesocycles } from "@/hooks/config/use-mesocycles";

export function MesocicloList() {
  const { data } = useMesocycles();
}
```

## Why

1. **Separation of concerns** — API routes are the backend boundary. Components (server or client) are the frontend. Mixing them creates tight coupling between UI and database schema.
2. **Single source of truth** — All business logic, validation, and authorization live in API routes. No risk of bypassing rules by calling the database from a different place.
3. **Portability** — If you ever split into a separate backend (e.g., Express, Fastify), the frontend already talks to APIs and nothing changes.
4. **Consistency** — Client components use `apiFetch` → API routes → Prisma. Server components use `fetch` → API routes → Prisma. Same pipeline, same validation, same auth checks.
5. **Testability** — API routes are independently testable. Direct database calls scattered across components are not.

## Where Prisma IS allowed

Only inside `/api` route handlers:

```
src/app/api/          ← Prisma imports allowed here
src/lib/prisma.ts     ← Prisma client singleton
src/lib/auth.ts       ← Auth config (uses Prisma adapter)

Everything else       ← NO Prisma imports, fetch through /api
```
