---
name: stackyrd-frontend-dev
description: Develop and maintain the SvelteKit admin dashboard in web/ — Svelte 5 + SvelteKit 2 + Tailwind v4 + Vite 8 + shadcn-svelte SPA that manages the stackyrd Go service framework. Use this skill whenever the user works on web/ files, adds or modifies Svelte routes, components, stores, API clients, or styles; touches web/package.json, vite.config.ts, svelte.config, tsconfig.json, or src/lib and src/routes; mentions dashboard, frontend, SvelteKit, Svelte 5 runes, Tailwind, shadcn, theme, Vite proxy, MCP, or PUBLIC_API_URL; or runs web dev/build/check commands. Even if the user does not name the skill explicitly, apply it for any web/ dashboard task.
---

# stackyrd Frontend Dev Guide

SvelteKit + shadcn-svelte admin dashboard — SPA for stackyrd Go service framework (Echo v4). Playful bold design (black 2px borders, rounded-full/2xl), polling + MCP JSON-RPC + REST. Root is SvelteKit project (no `web/` subdir in this repo).

```
→ Vite proxy (/api,/mcp,/health,/metrics,/swagger → :8080) → stackyrd Go → SvelteKit SPA
```

## Stack

| Layer | Choice | Version |
|-------|--------|---------|
| Framework | SvelteKit | 2.63 |
| UI | Svelte 5.56 runes + shadcn-svelte + bits-ui + motion | 5.56 |
| Build | Vite 8 | 8.0 |
| Style | Tailwind v4 + tw-animate-css (`@import "tailwindcss"`) | 4.x |
| Variants | tailwind-variants, clsx, tailwind-merge | — |
| Icons | lucide-svelte only (never emoji) | 0.460 |
| Fonts | Product Sans + Space Grotesk (sans/display), Space Mono (mono) | cdnfonts + Google Fonts |
| Lang | TypeScript 6 strict | 6.0 |
| Adapter | @sveltejs/adapter-auto | 7.0 |

No emoji as icons — always `lucide-svelte` SVG. One file before three, stdlib before deps. Default font-weight 600 (semibold), `font-mono` is 400.

## Quick Reference

```bash
npm install
cp .env.example .env  # PUBLIC_API_URL, PUBLIC_MCP_URL, PUBLIC_API_TOKEN
npm run dev     # Vite dev proxy → :8080 (no CORS)
npm run build   # vite build
npm run check   # svelte-kit sync + svelte-check
npm run preview
```

## Directory Layout

```
./
├── vite.config.ts      # sveltekit() + tailwindcss() + server.proxy (/api,/mcp,/health,/metrics,/swagger)
├── svelte.config.js    # adapter-auto + $lib alias (required for shadcn)
├── components.json     # shadcn config (zinc, $lib/components, $lib/utils)
├── tsconfig.json       # extends .svelte-kit/tsconfig.json, strict
├── static/robots.txt
├── src/
│   ├── app.html        # inline script hydrates theme from localStorage before paint; default light
│   ├── app.css         # p5-inspired tokens: @theme inline + :root/.dark/.night; font imports BEFORE tailwind
│   ├── app.d.ts        # generated SvelteKit types (no manual $env declare)
│   ├── lib/
│   │   ├── utils.ts        # cn(...inputs) → twMerge(clsx(...))
│   │   ├── api/
│   │   │   ├── rest.ts         # apiFetch<T>(path, token, opts) — browser uses relative via proxy, SSR uses env.PUBLIC_API_URL
│   │   │   ├── mcp.ts          # resolveMcpUrl(): localStorage mcpUrl or /mcp (browser, normalizes localhost:8080→/mcp) / PUBLIC_MCP_URL (SSR), POST + MCP-Protocol-Version 2026-07-28, SSE/batch + X-MCP-Instance-ID header capture
│   │   │   └── endpoints.ts    # typed wrappers + normalization + effToken fallback; getMCPUpTime/Resources/Identity/Cluster
│   │   ├── stores/
│   │   │   ├── auth.ts         # auth (token/apiUrl/mcpUrl/authenticated), theme: ThemeName light|dark|night default light + applyTheme(), toasts, sidebarCollapsed; logout() stops logStore + resets data stores
│   │   │   ├── data.ts         # health, services, infra, endpoints, mcpUptime, resources, instanceIdentity, mcpInstanceId, connectionStatus
│   │   │   └── logs.ts         # singleton logStore: EventSource /api/v1/events/stream + buffer flush, start()/stop() idempotent
│   │   ├── types/api.ts        # ApiResponse, HealthData (flexible), ServiceMeta, InfraStatus, EndpointList, UptimeData, ResourceData, InstanceIdentity
│   │   └── components/
│   │       ├── layout/         # Sidebar (w-64, navItems + press animate), TopBar (h-16, clock font-semibold), PageHeader (p5 header)
│   │       └── ui/             # shadcn: Button (rounded-full), Card (border-2), Badge, Input, Label, Separator, Table, Skeleton, Alert (destructive=black/red override for login), ThemeToggle, ConnectionAlert (persistent banner only), EmptyState (icon: Component), StatCard, Spinner, Toast
│   └── routes/
│       ├── +layout.svelte      # import '../app.css', auth guard (redirect unauth→/login), <Sidebar/><TopBar/><main pt-16 pl-64|pl-16><ConnectionAlert/>; fly page transition, global health polling (10s) gated by authenticated, logStore start/stop
│       ├── +page.svelte        # Overview — Promise.allSettled health/services/infra/uptime/resources/identity + live uptime ticker + System Resources (semibold) + Instance Identity (X-MCP-Instance-ID) above Services/Infrastructure
│       ├── login/+page.svelte  # validates via POST /mcp ping 2xx, red Alert bg-red-600 text-white on invalid token, no duplicate toast, sessionChecking
│       ├── services/+page.svelte + [name]/+page.svelte (15s poll, guard authenticated)
│       ├── infrastructure/+page.svelte + [name]/+page.svelte (5s poll)
│       ├── metrics/+page.svelte (10s poll, Service unavailable card on 503/404)
│       ├── logs/+page.svelte   # uses singleton logStore (background, survives nav, no onDestroy close)
│       ├── endpoints/+page.svelte (30s poll)
│       ├── swagger/+page.svelte # iframe /swagger/index.html via proxy + /swagger/doc.json probe
│       ├── config/+page.svelte
│       └── settings/+page.svelte # Appearance: ThemeToggle, apiUrl/mcpUrl (saves /mcp)
```

## Critical Fixes (do not regress)

### CSS Not Loading
`+layout.svelte` must `import '../app.css'` — without it Tailwind/shadcn tokens never load → plain HTML.

### CSS @import Order (postcss)
External font `@import url(...)` must be **before** `@import "tailwindcss"` and all `@import`s consecutive at top, else Vite inlines Tailwind first and font imports end up after rules → `[@vite:css][postcss] @import must precede all other statements`. Order: font Product Sans → font Space Grotesk/Mono → `tailwindcss` → `tw-animate-css` → `@custom-variant` → `@theme`.

### CORS / Vite Proxy
`rest.ts` uses `browser ? path : PUBLIC_API_URL+path` — browser fetches `"/health"` via proxy. `mcp.ts` uses `resolveMcpUrl()`: browser → `localStorage.mcpUrl ?? "/mcp"` normalized (`localhost:8080` → `/mcp`) via proxy, SSR → `PUBLIC_MCP_URL`. Never use absolute `PUBLIC_*` in browser fetch. Proxy in `vite.config.ts` handles all 5 prefixes (`/api,/mcp,/health,/metrics,/swagger`). Fixes `blocked by CORS: No 'Access-Control-Allow-Origin'` on `POST http://localhost:8080/mcp`.

### MCP POST + SSE/Batch + Instance Header
MCP endpoint is POST-only. `mcp.ts` always `POST` with `Content-Type: application/json`, `Accept: application/json, text/event-stream`, `MCP-Protocol-Version: 2026-07-28`, `Mcp-Method`/`Mcp-Name` for `tools/call`. Handles `text/event-stream` SSE (`data:` lines) + batch `Array<JSONRPCResponse>` + `X-MCP-Instance-ID` header captured to `mcpInstanceId` store. `ApiError` handled as `405`.

### Health/Spinner Forever + Missing Services/Infra/Uptime
`Promise.all` failing on one MCP `401` blocked `health.set()`. Now `Promise.allSettled` per-resource, `connectionStatus` set `connected` if any success. `endpoints.ts` normalizes raw MCP shapes: `services` (`state`→`status`, `endpoints: string[]`→`EndpointMeta[]`), `infra` (`status.connected`→string), `endpoints: string[]`→`EndpointList` grouped, `health` fallback `uptimeDisplay = uptime ?? status ?? progress%`. Token fallback: `effToken(token) => token || PUBLIC_API_TOKEN`.

### Uptime Real Data via MCP
`+page.svelte` uses `stackyrd_uptime` tool (`uptime/uptime_seconds/started_at/started_at_unix`) via `getMCPUpTime`, priority `mcpUptimeMs = now - started_at` else `uptime_seconds + elapsed` else Go duration parse, fallback to `health` `started_at/uptime` then `firstSeenAt`; live ticker `now` every 1s, `formatDuration` (`Xd Yh Zm`). Shows `● live from MCP • stackyrd_uptime`.

### System Resources + Instance Identity via MCP
`stackyrd_resources` (gopsutil: `cpu_percent/mem_percent/mem_used/total_mib/cores/goroutines/app_mem_mib/hostname/cpu_model/pid`) + `stackyrd_identity`/`stackyrd_cluster` (`instance_id/pod_name/pod_ip/namespace/node_name/hostname/pid/started_at` via `crypto/rand` hex + `INSTANCE_ID/POD_*` env, `X-MCP-Instance-ID` on all Responses, `stackyrd://identity`/`cluster` resources). Overview polls `getMCPResources`/`getMCPIdentity` alongside health, stores `resources`/`instanceIdentity`/`mcpInstanceId`, displays `System Resources` card (semibold) **above** Services/Infrastructure, then `Instance Identity` card (8 cells) with header badge.

### Theme Default Light
`app.html` inline script and `auth.ts` `loadTheme()` default to `light` (not `dark`) for first visit/SSR; `applyTheme` sets `html.classList` + `colorScheme`. Existing stored `dark`/`night` respected.

### Theme Flash
`app.html` inline script reads `localStorage stackyrd_theme` before paint and sets `html.classList + colorScheme`. `auth.ts` `theme` is `ThemeName` and `applyTheme()` on subscribe.

### Layout Stacking
`Sidebar` `w-64` expanded / `w-16` collapsed, `TopBar` `left-64`/`left-16` `h-16`, `main` `pt-16 pl-64|pl-16`. All three must stay in sync — previously `pl-56` caused 32px overlap.

### Emojis Banned
`EmptyState` prop is `icon?: unknown` (lucide Component), usage `icon={Search}` not `icon="🔍"`. Search codebase for `icon="[^"]"` and `📊🔗⚙️🔌🔍⚠️` before commit.

### Login Token Validation via /mcp
`login/+page.svelte` validates via `POST /mcp` `ping` (must be HTTP 2xx) not `/health` (public). `onMount` validates stored token via `mcpCall(token,'ping')` → success `goto('/')`, fail `auth.logout()` + red Alert `bg-red-600 text-white`. `handleLogin` validates via `mcpCall(attemptToken,'ping')` before `setToken/setAuthenticated`. No duplicate right-corner toast on failure (only red card); `form onsubmit` only (no `Button onclick` double).

### Login Refresh Loop
`+layout` removed `navigatedByGuard` flag (caused blocked effect); now `onMount`+`$effect` handle `!authed && !isLogin → goto('/login',replaceState)` and `authed → logStore.start() else stop()`. Login `goto` uses `replaceState` + `checkingToken` guard, `Button type=submit` only.

### Invalid Token Alert Color
Login `Alert` uses `variant="destructive" class="bg-red-600 text-white border-red-600 [&>svg]:text-white"` with white `AlertTitle/Description`.

### Logs Background Stream
`logs/+page.svelte` uses singleton `logStore` (`start()` idempotent, `stop()` on logout) — `EventSource /api/v1/events/stream` + `buffer` flush timer persist across nav (`onMount logStore.start()`, no `onDestroy close`). Layout starts `logStore` when `authed`.

### Metrics Unavailable
`metrics/+page` catches `getMetrics` `ApiError` `503/404` → `unavailable=true` shows `Service unavailable` Card (`WifiOff`, `metrics.enabled=true` hint) not just empty.

### Swagger Embed
`/swagger → :8080` proxied, `routes/swagger/+page.svelte` embeds `iframe src=/swagger/index.html` + `Card` + probe `fetch /swagger/doc.json`.

### Rate Limit Disabled
`stackyard/config.yaml` + `dist/config.yaml`: `middleware.ratelimit: false`, `mcp.rate_limit_enabled: false` (was `true` 1000/36000). `mcpserver.go` respects `rateLimitEnabled` flag + `isRateLimitExcluded`.

### Logout Stops All Background Tasks + Health Gated
`auth.logout()` stops `logStore`, resets `health/services/infra/resources/instanceIdentity/mcpUptime/mcpInstanceId/connectionStatus='checking'`, clears storage. `+layout` global `healthPolling` (`checkHealth` every 10s) and per-page polling (`overview 10s + 1s ticker`, `metrics 10s`, `services 15s`, `infra 5s`, `endpoints 30s`) guard `if (!$auth.authenticated) return` and `$effect` clears/restarts `setInterval` when `!authed`→`authed` — prevents `PUBLIC_API_TOKEN` fallback fetch after logout and ensures restart on re-login.

### Page Transition + Clock Font
`+layout` `{#key $page.url.pathname} in:fly` (320ms) with `reduceMotion` guard; `Sidebar` press `animate scale` via `{@attach}`; `TopBar` clock now `font-semibold text-foreground` (not `font-mono`).

## Conventions

### Svelte 5 Runes
```svelte
<script lang="ts">
  import type { Snippet } from 'svelte';
  let { label, value, children, class: className = '' } = $props<{ label: string; value: string; class?: string; children?: Snippet }>();
  let filter = $state<'all' | 'running'>('all');
  let loading = $state(true);
  const filtered = $derived(filter === 'all' ? $services : $services.filter(s => s.status === filter));
  $effect(() => { if (!$auth.authenticated && $page.url.pathname !== '/login') goto('/login', {replaceState:true}); });
  onMount(async () => { if ($auth.authenticated) { await pollData(); polling = setInterval(pollData, 10000); }});
  onDestroy(() => { if (polling) clearInterval(polling); });
  $effect(() => { if (!$auth.authenticated && polling) { clearInterval(polling); polling=null; } else if ($auth.authenticated && !polling) { pollData(); polling=setInterval(pollData,10000); }});
</script>
```
`$props` with `class: className`, `$state`/`$derived`/`$effect`, `{@render children?.()}`, `onclick` attribute, `{@attach}` not `use:`/`on:click`.

### Routing
`+page.svelte` per segment, `[name]/+page.svelte` dynamic, `+layout.svelte` shell with auth guard (`onMount` + `$effect` → `/login`, handles `authenticated && isLogin → /` via login). Sidebar active via `RegExp` tested against `$page.url.pathname`.

### Stores
```ts
// auth.ts — ThemeName light|dark|night default light, persisted, applied to html
export const theme = writable<ThemeName>(loadTheme()); // applyTheme() sets html class
export const auth = createAuthStore(); // token, apiUrl, mcpUrl, authenticated, lastChecked; logout() stops logStore + resets data
export const toasts = createToastStore(); // add(type, msg, duration?), dismiss, clear
export const sidebarCollapsed = writable(false);

// data.ts
export const health = writable<HealthData | null>(null);
export const services = writable<ServiceMeta[]>([]);
export const infra = writable<InfraStatus[]>([]);
export const mcpUptime = writable<UptimeData | null>(null);
export const resources = writable<ResourceData | null>(null);
export const instanceIdentity = writable<InstanceIdentity | null>(null);
export const mcpInstanceId = writable<string | null>(null);
export const connectionStatus = writable<'connected'|'disconnected'|'checking'>('checking');
// logs.ts singleton
export const logStore = createLogStore(); // start()/stop()/clear()/setPaused/setInterval/exportLogs, subscribe {logs,buffer,paused,streamInterval,connectionStatus}
```
Guard `localStorage`/`crypto.randomUUID()` with `browser`. Layout global `healthPolling` + `logStore` gated by `authenticated`, with restart.

### API Layer
```ts
// rest.ts
apiFetch<T>(path, token, {method, body, headers, signal}): Promise<T> // browser→relative via proxy
// mcp.ts
resolveMcpUrl(endpoint?) // browser: localStorage.mcpUrl ?? "/mcp" normalized localhost:8080→/mcp, server: PUBLIC_MCP_URL
mcpCall(token, method, params?, endpoint?): Promise<unknown> // POST + MCP-Protocol-Version 2026-07-28, handles SSE text/event-stream + batch Array, captures X-MCP-Instance-ID → mcpInstanceId
// endpoints.ts — normalization + effToken fallback
getHealth, getMCPServices (raw→ServiceMeta), getMCPInfra (raw→InfraStatus), getMCPEndpoints (string[]→EndpointList), getMetrics (throws ApiError on !ok), getMCPUpTime/Resources/Identity/Cluster
```
`Authorization: Bearer <token>` when present. `mcp.ts` parses `SSE data:` lines → `JSON.parse` then `data.error` check, `405 GET` friendly message. `rest.ts` uses `env.PUBLIC_API_URL` per-request (not const).

### Styling (Tailwind v4 + shadcn)
`app.css`:
```css
@import url(cdnfonts Product Sans); @import url(googleapis Space Grotesk/Mono); @import "tailwindcss"; @import "tw-animate-css";
@custom-variant dark (&:is(.dark *, .night *)); @custom-variant night (&:is(.night *));
@theme inline { --color-background: var(--background); ... --color-p5-yellow: #dfed33; ... --font-sans: 'Product Sans','Space Grotesk',...}
:root  /* light default */  { --background:#fff; --foreground:#000; --card:#fff; --primary:#ed225d; --secondary:#f7f7f7; --muted:#f7f7f7; --border:#000; --sidebar:#fff; }
.dark  /* dark */   { --background:#000; --foreground:#f9b2c6; --card:#111; --primary:#f1678e; --border:#2a2a2a; }
.night /* muted */   { --background:#f7f7f7; --foreground:#000; --card:#fff; --primary:#000; --border:#000; }
@layer base { *{@apply border-border} body{@apply bg-background text-foreground; font-weight:600} h1,h2,h3{font-weight:700} ::selection{background:var(--color-p5-yellow)} }
```
- Light is default (both `app.html` and `loadTheme()`), dark = black bg magenta type, night = muted light.
- Components: `Button` `rounded-full border-2 border-black`, `Card` `rounded-2xl border-2 border-black shadow-sm`, `Input` `rounded-full border-2`, `Badge` `rounded-full border-2`, `StatCard` top `h-1.5` accent bar (yellow/magenta/green/blue).
- Resource/Instance cards use `font-semibold` (not mono) throughout.
- Sidebar `border-r-2 border-black`, active nav `bg-p5-yellow border-black rounded-full`, TopBar `h-16 border-b-2`, clock `font-semibold`, PageHeader `text-3xl md:text-4xl` + pink dot + semibold subtitle `border-l-2`.
- Always `cn()` from `$lib/utils.ts`, `tailwind-variants` for Button/Badge, never raw hex in components.

### Environment
| Var | Source | Default |
|-----|--------|---------|
| `PUBLIC_API_URL` | `.env` | `http://localhost:8080` |
| `PUBLIC_MCP_URL` | `.env` | `http://localhost:8080/mcp` |
| `PUBLIC_API_TOKEN` | `.env` | `f76fda...` (fallback when `auth.token` empty, but polling gated by `authenticated` so no fetch after logout) |

## Adding Things
### New Page
1. Create `routes/<name>/+page.svelte` with `onMount` poll + `onDestroy` + `$effect` auth-guard restart (copy `services/+page.svelte` pattern: `if (!authed) return`, `polling = setInterval`).
2. Add to `Sidebar.svelte` `navItems` with lucide icon + `match: RegExp`.
3. Add type to `types/api.ts` if needed.
4. Add wrapper to `endpoints.ts` with `effToken` + normalization (`mcpToolsCall` for MCP).
5. Use `PageHeader`, `Card`/`CardHeader`/`CardContent`, `Badge`, `Button`, `EmptyState icon={Lucide}`; add `vite proxy` entry if new `/prefix` → `:8080`.

### New UI Component
Follow shadcn shape: `$props<{ variant?, size?, class?, children?: Snippet, [key:string]: unknown }>` + `cn()` + `tv({base, variants})`. Place under `ui/` with `components.json` aliases. Keep `utils.ts` `cn`.

### New Store
Ephemeral → `data.ts` (+ `logs.ts` for singleton), persisted → `auth.ts` (browser guard, `applyTheme` pattern). Always gate polling with `authenticated`.

## Ponytail Constraint
One file before three, delete before add. No new UI lib/state lib/chart lib unless task impossible with stores + Tailwind/shadcn. Keep `adapter-auto` + proxy + `PUBLIC_*` sufficient.

## Verification
```bash
npm run check  # 0 errors
npm run build  # vite build OK
```
If `$props` errors, run `svelte-kit sync` (`npm run check` does). Hard reload after theme/proxy/env changes.

