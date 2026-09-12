# AGENTS.md

## Project Overview

`setup-zig` is a GitHub Action that installs the Zig toolchain on CI runners.
It is a **JavaScript action** (`runs.using: node24`) — the code runs directly on
the GitHub-hosted runner, not in a container. The source is written in TypeScript
and bundled to a single `dist/index.js` that the runner executes.

## Stack & Tooling

- **Language**: TypeScript, compiled/bundled to JavaScript, **ESM only** (`"type": "module"`). Use `import` / `export`, never `require`.
- **Package manager**: **pnpm@12.4.1** (enforced by `packageManager` + `devEngines`). Never run `npm install` / `yarn`.
- **Formatter**: **Biome** — format with `pnpm exec biome format --write .`; config lives in `biome.json`.
- **Runtime**: Node.js >= 24.
- **Entry point**: `dist/index.js` — the **committed** bundle produced by the build step. Do not edit `dist/` by hand.

## Commands

- Install dependencies: `pnpm install`
- Build: `pnpm build` (bundles TypeScript source to `dist/index.js`)
- Format: `pnpm exec biome format --write .`
- Tests: none defined yet (package.json has a stub).

## Conventions

- Use the official GitHub Actions toolkit:
  - `@actions/core` — action inputs/outputs and logging (`core.getInput`, `core.setOutput`, `core.addPath`).
  - `@actions/tool-cache` — download and cache the Zig tarball (`tc.downloadTool`, `tc.extractTar`, `tc.cacheDir`).
  - `@actions/exec` — run `zig` after installing it.
- Resolve available Zig versions from the canonical index: `https://ziglang.org/download/index.json`.

## Pitfalls

- Bundle with `@vercel/ncc` (or equivalent) into `dist/index.js` and **commit** that file —
  the runner executes it directly and cannot install dependencies. Keep build/lint tooling
  out of the bundle.
- The repo root must contain an `action.yml` (or `action.yaml`) declaring inputs, outputs, and
  `runs.using: node24` + `runs.main: dist/index.js`. This is the action's public contract.
- `core.addPath()` must be called so `zig` is available to subsequent workflow steps.
- Rebuild (`pnpm build`) before committing any change to `src/` so `dist/index.js` stays in sync.

## Key Files

- `package.json` — metadata, build/format scripts, pnpm/Node constraints.
- `src/` (to be created) — TypeScript source.
- `dist/index.js` — committed build output that the runner executes.
- `action.yml` (to be created) — action inputs/outputs and runtime declaration.
- `biome.json` (to be created) — Biome formatter/linter config.
