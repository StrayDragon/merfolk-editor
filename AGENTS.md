# Repository Guidelines

## Project Structure & Module Organization
- `src/main.ts` boots the Svelte app and exports library entry points; `src/App.svelte`/`src/DebugApp.svelte` drive the UI shell.
- `src/components` holds UI pieces (e.g., `Editor.svelte`), while `src/lib/index.ts` exposes the `MerfolkEditor` class for embedding.
- Diagram logic lives in `src/core` (`parser`, `serializer`, `model`, `sync`, `extractor`), and canvas interactions live in `src/canvas` (`shapes`, `edges`, `layout`).
- Tests sit next to sources under `src/**/*.{test,spec}.{js,ts}` with shared setup in `test/setup.ts`.
- `docs` contains reference Mermaid materials; `examples` offers HTML demos; build artifacts land in `dist/`.

## Build, Test, and Development Commands
- `pnpm install` — install dependencies (use pnpm consistently).
- `pnpm dev` — start Vite dev server; append `?debug=true` to the URL to load `DebugApp`.
- `pnpm build` — build the app bundle; `pnpm build:lib` builds the published library output in `dist/lib`.
- `pnpm preview` — preview the production build locally.
- `pnpm check` — run `svelte-check`/TypeScript for type and prop validation.
- `pnpm test` — run Vitest (jsdom) with Svelte Testing Library helpers.

## Coding Style & Naming Conventions
- TypeScript is strict; avoid `any`, honor `noUnused*` rules, and prefer typed interfaces defined in `src/core`.
- Use 2-space indentation; keep Svelte components in PascalCase files with `<script lang="ts">`.
- Favor small, focused modules; prefer path aliases from `tsconfig.json` (`$lib`, `$core`, `$canvas`, `$components`) over relative dot paths.
- Keep styles scoped within components unless intentionally global; align UI defaults with existing system font stack in `App.svelte`.

## Testing Guidelines
- Place unit tests beside the code they cover; use `@testing-library/svelte` for component behavior and Vitest spies/mocks for sync logic.
- Maintain jsdom-friendly tests; browser APIs should be polyfilled in `test/setup.ts` if needed.
- Target high-risk areas first: parser/serializer fidelity, sync edge cases, canvas interactions, and exported API surface (`src/lib`).
- Add reproduction-focused tests for fixed bugs before code changes; prefer descriptive names like `MermaidParser.reverse.test.ts`.

## Commit & Pull Request Guidelines
- History is minimal; use clear, imperative subjects. Conventional Commits (`feat:`, `fix:`, `chore:`, `test:`) are preferred for readability.
- Ensure commits include relevant tests or notes on why testing is not applicable.
- PRs should summarize intent, link issues, call out breaking changes, and include before/after screenshots or GIFs for UI-facing work.
- Describe manual verification steps (e.g., flows run in `pnpm dev`, library import sanity check) and note any follow-up tasks.
