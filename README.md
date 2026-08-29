# Stackyrd Web Dashboard

Admin dashboard for managing the stackyrd service framework. Built with SvelteKit, Tailwind CSS, and shadcn-svelte components.

## Tech Stack

- **Framework:** SvelteKit 2 (Svelte 5)
- **Styling:** Tailwind CSS v4, shadcn-svelte (bits-ui)
- **Icons:** Lucide Svelte
- **Animations:** GSAP, motion
- **Language:** TypeScript
- **Build Tool:** Vite

## Prerequisites

- Node.js 18+
- npm or pnpm
- A running stackyrd instance (default: `http://localhost:8080`)

## Setup

```bash
npm install
cp .env.example .env
npm run dev
```

The dashboard will be available at `http://localhost:5173`.

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PUBLIC_API_URL` | Stackyrd REST API base URL | `http://localhost:8080` |
| `PUBLIC_MCP_URL` | Stackyrd MCP endpoint | `http://localhost:8080/mcp` |
| `PUBLIC_API_TOKEN` | API bearer token | (empty) |

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Vite dev server with proxy |
| `npm run build` | Production build |
| `npm run preview` | Preview production build locally |
| `npm run check` | Run svelte-check type checking |
| `npm run check:watch` | Type checking in watch mode |

## Development

The Vite dev server proxies `/api`, `/mcp`, `/health`, and `/metrics` to the local stackyrd instance on port 8080. No CORS configuration is needed on the backend.

The dashboard supports three themes: light, dark, and night. Theme state is persisted in local storage.

## License

See [LICENSE](./LICENSE).
