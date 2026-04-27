# Server-Side Fetch Pattern (Vercel + NextAuth)

## The Problem

Server components that fetch their own API routes can break on Vercel due to cookie domain mismatch.

```tsx
// app/page.tsx (server component)
const cookieStore = await cookies();
const res = await fetch(`${getBaseUrl()}/api/dashboard`, {
  headers: { cookie: cookieStore.toString() },
});
const data = await res.json(); // 💥 CRASHES — got HTML instead of JSON
```

### Why It Crashes

1. **Vercel deploys create unique URLs** — each deploy gets its own URL like `gym-tracker-abc123.vercel.app`, separate from the production domain `gym-tracker-swart-five.vercel.app`.

2. **`VERCEL_URL` returns the deployment URL**, not the production domain. If the server uses `VERCEL_URL` to self-fetch, the request goes to `gym-tracker-abc123.vercel.app`.

3. **Auth cookies are set on the production domain** — NextAuth sets `authjs.session-token` on `gym-tracker-swart-five.vercel.app`. The cookie is NOT valid on `gym-tracker-abc123.vercel.app`.

4. **The proxy/middleware intercepts the request** — sees no valid session token (wrong cookie domain), and for page requests returns a redirect to `/login` (HTML). For API requests it returns `{ error: "Unauthorized" }` (JSON).

5. **`res.json()` chokes on HTML** — the server page gets `<!doctype html>...` back from the login redirect, tries to parse it as JSON, and throws `SyntaxError: Unexpected token '<', "<!doctype "... is not valid JSON`.

### The Chain

```
Server Component (page.tsx)
  → fetch("https://gym-tracker-ABC123.vercel.app/api/dashboard")
    → Proxy runs on deployment ABC123
      → getToken() can't read cookie (set on production domain)
        → Returns 401 or redirects to /login (HTML)
          → res.json() crashes on HTML response
```

## The Fix

`getBaseUrl()` must always return the **production domain** on Vercel, never the deployment-specific URL:

```tsx
// src/lib/base-url.ts
export function getBaseUrl() {
  if (process.env.NEXT_PUBLIC_URL) return process.env.NEXT_PUBLIC_URL;
  if (process.env.VERCEL) return "https://gym-tracker-swart-five.vercel.app";
  return `http://localhost:${process.env.PORT || 3000}`;
}
```

This ensures server self-fetches always go to the domain where the cookie is valid.

### Alternative: Set NEXT_PUBLIC_URL in Vercel

Instead of hardcoding, add `NEXT_PUBLIC_URL` as an environment variable in Vercel project settings:

```
NEXT_PUBLIC_URL = https://gym-tracker-swart-five.vercel.app
```

This is more flexible if you change domains, but the hardcoded fallback works as a safety net.

## Why Not Just Use Prisma Directly?

Server components CAN call Prisma directly — they run on the server. The self-fetch pattern exists because the project follows a "data access through API routes" architecture for separation of concerns.

The trade-off:
- **Self-fetch via API routes**: clean separation, but adds HTTP overhead and cookie forwarding complexity on serverless
- **Direct Prisma in server components**: faster, no cookie issues, but business logic lives in two places (API route + server page)

This project uses self-fetch with the production domain fix. If it causes more issues in the future, extract the query logic into shared `lib/server/` functions that both API routes and server pages import directly — no HTTP round-trip needed.

## Rules

1. **Never use `VERCEL_URL` for self-fetch** — it returns deployment-specific URLs where auth cookies don't work
2. **Always use the production domain** — either via `NEXT_PUBLIC_URL` env var or hardcoded fallback
3. **Always forward cookies** on server self-fetches — `headers: { cookie: cookieStore.toString() }`
4. **Handle non-JSON responses** defensively — if `res.ok` is false, don't blindly call `res.json()`
5. **localhost works fine** — this is only a Vercel/serverless issue. Local dev with `http://localhost:3000` has no cookie domain problems
