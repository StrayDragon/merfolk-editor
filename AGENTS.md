# Repository Guidelines

## Project Structure & Module Organization
- Source lives in `src/`: `core` holds models, parser/serializer, and sync engine logic (with co-located `*.test.ts`), `canvas` covers rendering/layout, `components` are Svelte UI pieces, and `lib/index.ts` is the library surface. `main.ts` mounts the app (switches `App`/`DebugApp` via URL params).
- End-to-end specs reside in `e2e`; shared test setup/mocks are in `test/setup.ts`. Reference docs and architecture notes sit in `docs`, sample integrations in `examples`, and built assets land in `dist` (generated—avoid manual edits).
- Path aliases are available: `$core/*`, `$canvas/*`, `$components/*`, `$lib/*`.

## Build, Test, and Development Commands
- Install: `pnpm install` (pnpm is the locked-in package manager).
- Develop: `pnpm dev` to run Vite locally; `pnpm preview` to serve the production build.
- Build: `pnpm build` for the app bundle; `pnpm build:lib` for the publishable library output.
- Static checks: `pnpm check` runs `svelte-check` with the repo TS config.
- Tests: `pnpm test` executes Vitest in jsdom with setup from `test/setup.ts`; `pnpm test:e2e` runs Playwright (uses `chromium` from PATH or `PLAYWRIGHT_CHROMIUM_EXECUTABLE`).

## Coding Style & Naming Conventions
- TypeScript strict mode is enabled. Use two-space indentation, camelCase for variables/functions, PascalCase for Svelte components and classes, and prefer typed exports with early returns.
- Co-locate unit specs as `*.test.ts`/`*.spec.ts` beside the implementation. Keep UI concerns in Svelte files and core logic in `src/core` to maintain separation.
- Use the provided path aliases instead of relative `../../` chains. Favor small, composable functions and avoid mutating shared state outside models/sync utilities.

## Testing Guidelines
- For new logic in `core`, add or extend Vitest cases next to the file and reuse existing mocks in `test/setup.ts` (mermaid/d3 are mocked there).
- E2E specs in `e2e` use the dev server on `localhost:5173` (strictPort). Keep interactions deterministic; wait for SVG/text selectors instead of fixed sleeps where possible.
- When changing canvas interactions or bidirectional sync, add a regression test (unit or e2e) that captures the observed failure mode.

## Commit & Pull Request Guidelines
- Recent history favors short, scoped prefixes (e.g., `init: ...`, `sync: ...`). Use `type: summary` in the imperative, keep subjects under ~72 chars, and describe intent (not the diff).
- PRs should include: a concise summary, linked issues, test commands run (`pnpm test`, `pnpm test:e2e` when relevant), and before/after screenshots for UI changes. Note any breaking changes, new scripts, or doc updates in the description.
