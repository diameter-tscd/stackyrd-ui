# Contributing to Stackyrd UI

Welcome! We appreciate your interest in contributing to the Stackyrd web dashboard.

## Getting Started

### Prerequisites

- Node.js 18+
- npm or pnpm
- A running [stackyrd](https://github.com/stackyrd) server instance (for full integration testing)

### Setup

```bash
git clone https://github.com/stackyrd/stackyrd-ui.git
cd stackyrd-ui
npm install
cp .env.example .env
npm run dev
```

The dashboard will be available at `http://localhost:5173`.

## Development Workflow

1. **Fork** the repository and create your branch from `main`
2. **Install dependencies** with `npm install`
3. **Run the dev server** with `npm run dev`
4. **Make your changes** — the project uses SvelteKit 2, Svelte 5 runes, and Tailwind CSS v4
5. **Type-check** with `npm run check`
6. **Commit** following the conventions below

## Commit Convention

We follow [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` — new feature
- `fix:` — bug fix
- `docs:` — documentation changes
- `style:` — formatting (no logic change)
- `refactor:` — code restructuring
- `perf:` — performance improvement
- `test:` — adding or updating tests
- `chore:` — maintenance tasks

## Pull Request Process

1. Ensure `npm run check` passes (type-checking via svelte-check)
2. Update documentation if your change affects public APIs or behavior
3. Describe what your PR does and why — link any related issues
4. A maintainer will review and provide feedback or merge

## Project Structure

```
web/
├── src/
│   ├── lib/        # Shared components, stores, utilities
│   └── routes/     # SvelteKit pages
├── static/         # Static assets
└── .env.example    # Environment template
```

## Code Style

- **TypeScript strict mode** — no `any` types unless absolutely necessary
- **Svelte 5 runes** — use `$state`, `$derived`, `$effect` instead of legacy APIs
- **Tailwind CSS v4** — utility-first styling; avoid custom CSS unless needed
- **Component naming** — PascalCase for `.svelte` files
- **No CORS configuration** — Vite dev server proxies to the backend automatically

## Reporting Issues

- Use the [issue tracker](https://github.com/stackyrd/stackyrd-ui/issues)
- Include your environment (OS, Node version, browser)
- For bugs: describe expected vs actual behavior and steps to reproduce
- For features: explain the use case and proposed approach

## License

By contributing, you agree that your contributions will be licensed under the [MIT License](./LICENSE).
