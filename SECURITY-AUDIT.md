# Security Audit — Cardápio Digital

**Date:** 2026-03-24
**Status:** Pending fixes

---

## CRITICAL

### 1. Hardcoded JWT Secret Fallback
- **Location:** `apps/api/src/modules/auth/jwt.strategy.ts:17`, `auth.module.ts:20`
- **Issue:** Default `'dev-secret-change-me'` used if `JWT_SECRET` env var is missing — attacker can forge tokens
- **Fix:** Remove fallback, throw on startup if missing. Use `crypto.randomBytes(32).toString('hex')`

### 2. IDOR: Unauthenticated Order Retrieval
- **Location:** `apps/api/src/modules/orders/orders.controller.ts:22`
- **Issue:** `GET /api/orders/:id` has no auth — anyone with a UUID sees customer PII, address, payment info
- **Note:** By design (customer tracking via UUID). Acceptable if UUIDs never leak (logs, referrer headers)

### 3. IDOR: Unauthenticated Payment Status
- **Location:** `apps/api/src/modules/payments/payments.controller.ts:20`
- **Issue:** `GET /api/payments/:orderId/status` — anyone can check any order's payment status
- **Note:** Same UUID-as-auth pattern as #2

### 4. IDOR: Unauthenticated Payment Creation
- **Location:** `apps/api/src/modules/payments/payments.controller.ts:10-18`
- **Issue:** `POST /api/payments/pix` and `POST /api/payments/credit-card` — can trigger payment on any order
- **Note:** Same UUID-as-auth pattern. Low real risk since payment goes to the restaurant anyway

### 5. MercadoPago Credentials in .env
- **Location:** `.env`
- **Issue:** If `.env` is committed to git, tokens are in history forever
- **Fix:** Ensure `.env` is in `.gitignore`, rotate credentials, use secrets manager in production

### 6. HTTP API URL + ngrok in Config
- **Location:** `.env`
- **Issue:** `NEXT_PUBLIC_API_URL=http://...` — no TLS, MITM possible. ngrok URL not suitable for production
- **Fix:** Use HTTPS everywhere in production, set up proper DNS + SSL

---

## HIGH

### 7. Webhook Skips Signature Verification in Dev
- **Location:** `apps/api/src/modules/payments/webhook.controller.ts:28-34`
- **Issue:** If `NODE_ENV !== 'production'` and no webhook secret, accepts unsigned webhooks — attacker can fake payment approval
- **Fix:** Always verify signatures regardless of environment

### 8. Seeded Admin Credentials
- **Location:** `apps/api/src/seeders/run-seed.ts:313`
- **Issue:** `admin@tapiocaria.com / admin123` hardcoded and printed to console
- **Fix:** Force password change on first login, never log credentials

### 9. MIME Type Spoofing in File Upload
- **Location:** `apps/api/src/modules/admin/admin.controller.ts:22-43`
- **Issue:** Upload filter checks `file.mimetype` from request header, not actual file content. Client can set `mimetype = 'image/jpeg'` for any file
- **Fix:** Validate file magic bytes (content), whitelist extensions, not just MIME types

### 10. Static Uploads Served Without Content-Type Guards
- **Location:** `apps/api/src/main.ts:10`
- **Issue:** `useStaticAssets` serves uploads directly. An SVG/HTML file with `<script>` = stored XSS
- **Fix:** Set `Content-Type` headers strictly, add `Content-Security-Policy: script-src 'none'` for uploads

### 11. WebSocket Allows Unauthenticated Connections
- **Location:** `apps/api/src/modules/websocket/websocket.gateway.ts:25-35`
- **Issue:** Anyone can connect. Unauthenticated users receive `order:status-changed` events (order ID + status leak)
- **Fix:** Disconnect unauthenticated clients, or limit public events to minimal data

### 12. No Security Headers (Helmet)
- **Location:** `apps/api/src/main.ts`
- **Issue:** Missing CSP, X-Frame-Options, HSTS, X-Content-Type-Options
- **Fix:** `npm install helmet` and `app.use(helmet())`

### 13. No Rate Limiting on Login
- **Location:** `apps/api/src/modules/auth/auth.controller.ts:10`
- **Issue:** Unlimited login attempts — brute-force possible
- **Fix:** `@nestjs/throttler` — e.g. max 5 attempts per 60 seconds

### 14. No Granular Admin Roles
- **Location:** `apps/api/src/modules/admin/admin.controller.ts`
- **Issue:** Any authenticated user has full admin access (products, orders, store settings, dashboard)
- **Fix:** Add `role` field to AdminUser, include in JWT, check per-route

---

## MEDIUM

### 15. JWT Expiry Too Long
- **Location:** `apps/api/src/modules/auth/auth.module.ts:21`
- **Issue:** 24-hour token lifetime. Stolen token valid all day
- **Fix:** Reduce to 1-2h, implement refresh token rotation

### 16. Incomplete DTO Validation
- **Location:** `apps/api/src/modules/orders/dto/create-order.dto.ts`
- **Issue:** No `@MaxLength` on street, number, neighborhood, notes. No CEP format validation
- **Fix:** Add `@MaxLength(255)` to string fields, `@Matches(/^\d{5}-?\d{3}$/)` on CEP

### 17. Store Settings Accepts `any`
- **Location:** `apps/api/src/modules/admin/admin.controller.ts:192-194`
- **Issue:** `@Body() data: any` — no DTO, no validation. Arbitrary JSON can corrupt settings
- **Fix:** Create `UpdateStoreSettingsDto` with proper validators

### 18. Sensitive Data in Error Logs
- **Location:** `apps/api/src/modules/websocket/websocket.gateway.ts:66-67`
- **Issue:** `console.error` may log order details / stack traces
- **Fix:** Use structured logging, sanitize error output

### 19. JWT in Unencrypted localStorage
- **Location:** `apps/web/src/stores/auth-store.ts`
- **Issue:** Token accessible via XSS. Any injected script can read `localStorage['cardapio-auth']`
- **Fix:** Use httpOnly cookies for production, or accept risk since admin panel is internal

### 20. Race Condition on Order Number
- **Location:** `apps/api/src/modules/orders/orders.service.ts:49-53`
- **Issue:** `SELECT MAX(order_number) + 1` — concurrent requests get duplicate numbers (confirmed with test)
- **Fix:** Use `pg_advisory_xact_lock(1)` before the SELECT (discussed, ready to implement)
