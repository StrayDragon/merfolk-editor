# Repository Guidelines

## Project Structure & Module Organization
- `src/` contains the Svelte app and TypeScript source.
- `src/core/` holds the flowchart model, parser/serializer, and sync engine.
- `src/canvas/` implements D3-based rendering, layout, selection, and drag logic.
- `src/components/` is the Svelte UI layer (editor, dialogs, panels, toolbar).
- `src/lib/` exports the library entry point for packaging.
- `test/` has shared test setup; unit tests live alongside modules in `src/**`.
- `e2e/` contains Playwright specs; `docs/` stores research and planning notes.
- `dist/` and `test-results/` are generated outputs; avoid manual edits.

## Build, Test, and Development Commands
```bash
pnpm dev        # Start the Vite dev server
pnpm build      # Build app and library bundle
pnpm build:lib  # Build library bundle only
pnpm preview    # Preview production build locally
pnpm check      # TypeScript + Svelte type checking
pnpm test       # Run Vitest unit tests
pnpm test:e2e   # Run Playwright e2e tests (Chromium)
```

## Coding Style & Naming Conventions
- Use 2-space indentation and follow existing file formatting.
- Svelte 5 uses runes (`$state`, `$props`, `$effect`); keep components idiomatic.
- TypeScript is strict (`noUnusedLocals`, `noUnusedParameters`); fix warnings.
- Prefer path aliases (`$core/*`, `$canvas/*`, `$components/*`, `$lib/*`).
- Component files are `PascalCase.svelte`; tests use `*.test.ts` or `*.spec.ts`.

## Testing Guidelines
- Unit tests use Vitest and live next to the code (for example, `src/core/**`).
- E2E tests use Playwright in `e2e/*.spec.ts`.
- Add tests for new parsing, model, or canvas behaviors; mirror existing patterns.

## Commit & Pull Request Guidelines
- Commit messages follow Conventional Commits like `feat(canvas): ...`, `fix(parser): ...`, or `docs: ...` (both `docs` and `doc` appear in history).
- PRs should include a short summary, test commands run, and linked issues.
- Add screenshots or short clips for UI changes and call out breaking changes.

## Architecture Overview
- `src/core/` is the source of truth for flowchart data and Mermaid sync.
- `src/canvas/` renders nodes/edges and handles interaction state.
- `src/components/` composes the editor UI; see `CLAUDE.md` for deeper notes.
