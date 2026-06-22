# Azhar Finance — Web

Next.js 16.2.9 + TypeScript frontend for the Azhar Finance Go backend.

## Stack

- **Next.js 16.2.9** (App Router, Server Actions, typed routes)
- **React 19**, **TypeScript 5**
- **Tailwind CSS 4** (zero-config, `@tailwindcss/postcss`)
- **TanStack Query 5** for server state (cache + polling)
- **Axios** with auto-refresh interceptor
- **Zustand** for the in-memory auth slice (access token only)
- **React Hook Form + Zod** for forms (schemas mirror the Go `validate:` tags)
- **qrcode.react** for QRIS rendering
- **Sonner** for toasts
- **lucide-react** for icons

## Auth model — why a proxy?

The Go backend issues `access_token` + `refresh_token`. We keep:

- **access token** → in memory only (Zustand). Never persisted. Sent as
  `Authorization: Bearer …` on every API call.
- **refresh token** → in an **httpOnly cookie** set by Next route handlers. The
  browser JS never sees it, so XSS can't steal it.

All browser requests go to **`/api/proxy/*`** (same-origin), and the Next.js
route handler forwards them to the Go backend. The cookie roundtrips with the
proxy automatically.

```
Browser  ──Bearer──▶  /api/proxy/*       ──▶  Go backend (BACKEND_API_URL)
Browser  ──cookie──▶  /api/auth/refresh  ──▶  Go backend /auth/refresh
```

On 401 the axios interceptor calls `/api/auth/refresh` once, gets a new access
token, and retries the original request.

## Getting started

```bash
# 1) install
npm install         # or pnpm install / yarn

# 2) configure
cp .env.example .env.local
#   edit BACKEND_API_URL (default http://localhost:6000)
#   change COOKIE_SECRET to a long random string

# 3) run the Go backend separately, then
npm run dev         # http://localhost:3000
```

Make sure the Go backend allows the Next.js origin in `CORS_ALLOWED_ORIGINS`
(or just leave it `*` for local dev) — though the browser only talks to Next,
so CORS only matters for the Next→Go server-to-server hop (no CORS there).

## Project layout

```
app/
  (auth)/login         # sign in
  (auth)/register      # create account
  (dashboard)/dashboard
  (dashboard)/payments # lookup + status polling + QR display
  (dashboard)/payments/new
  (dashboard)/users    # paginated list + delete
  api/auth/login       # → /auth/login + set httpOnly cookie
  api/auth/refresh     # → /auth/refresh + rotate cookie
  api/auth/logout      # → /auth/logout + clear cookie
  api/proxy/[...path]  # catch-all → Go backend
components/
  ui/                  # button, input, label, card, badge
  providers.tsx        # QueryClient + Toaster
  sidebar.tsx
  use-bootstrap-session.ts  # exchanges refresh cookie for access token on load
lib/
  api/client.ts        # axios + auto-refresh
  api/auth-store.ts    # zustand (access token + user)
  api/types.ts         # envelope, pagination, token pair
  schemas/             # zod schemas mirroring Go validate tags
  server/env.ts        # server-only env validation
  server/cookies.ts    # httpOnly refresh cookie helpers
  utils.ts             # cn(), formatIDR, formatDate
```

## Scripts

| Command            | What                          |
|--------------------|-------------------------------|
| `npm run dev`      | Dev server                    |
| `npm run build`    | Production build              |
| `npm run start`    | Production server             |
| `npm run lint`     | ESLint                        |
| `npm run typecheck`| `tsc --noEmit`                |

## Notes & gotchas

- **Refresh token reuse detection:** if your Go backend rotates *and* revokes
  the old refresh token on each `/auth/refresh`, the proxy's `setRefreshCookie`
  call after refresh keeps the cookie in sync — no extra work needed.
- **CSRF:** because the refresh cookie is `SameSite=Lax` and `httpOnly`, plain
  cross-site form posts can't trigger refresh. If you ever switch to
  `SameSite=None` for cross-origin, add a CSRF token to mutating routes.
- **Webhook:** the webhook endpoint is server-to-server (Xendit → Go), so it
  doesn't go through this frontend at all. The "status PAID" view simply polls
  `/api/payments/:order_ref` until the backend reflects the new state.
- **Production:** set `COOKIE_SECURE=1` so cookies are `Secure`-flagged.
