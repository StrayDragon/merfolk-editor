# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Merfolk Editor is a visual Mermaid flowchart editor with bidirectional sync between Mermaid code and canvas. Users can edit diagrams visually or by editing Mermaid syntax, with changes reflected in both directions.

**Tech Stack**: Svelte 5 + TypeScript, D3.js for SVG rendering, @dagrejs/dagre for auto-layout, Vitest for tests.

## Commands

```bash
pnpm dev          # Start development server
pnpm build        # Build library (app + npm package)
pnpm build:lib    # Build only the library bundle
pnpm preview      # Preview production build
pnpm test         # Run unit tests
pnpm test:e2e     # Run Playwright e2e tests
pnpm check        # TypeScript and Svelte type checking
```

## Architecture

### Core Layer (`src/core/`)

**Data Model**: `FlowchartModel` is the single source of truth, using EventEmitter for change events. Stores nodes, edges, subgraphs, and class definitions.

**Parsing/Serialization**:
- `MermaidParser` - Parses Mermaid syntax into FlowchartModel (supports legacy bracket syntax and new `@{}` syntax)
- `MermaidSerializer` - Converts FlowchartModel back to Mermaid syntax

**Bidirectional Sync**: `SyncEngine` coordinates code <-> model synchronization. Key behaviors:
- Code changes parse into model (positions preserved separately since Mermaid doesn't support them)
- Model changes serialize to code with debouncing
- Built-in undo/redo with history stack
- Position storage decoupled from model (drag operations don't regenerate code)

### Canvas Layer (`src/canvas/`)

- `CanvasRenderer` - Main D3.js SVG renderer with zoom/pan, selection, and drag
- `ShapeRenderer` - Renders node shapes (rect, rounded, circle, diamond, etc.)
- `EdgeRenderer` - Renders edges with proper arrowheads and curves
- `DagreLayout` - Auto-layout using @dagrejs/dagre
- `SelectionManager` - Handles node/edge selection state
- `PortManager` / `EdgeCreationState` - Manages edge creation from node ports

### Component Layer (`src/components/`)

Svelte 5 components using runes (`$state`, `$props`, `$effect`). Key components:
- `Editor.svelte` - Main editor wrapper
- `InteractiveCanvas.svelte` - Canvas with drag/select/edit handlers
- `CodePanel.svelte` - Mermaid code editor
- `Toolbar.svelte` - Shape palette and tools
- `*Dialog.svelte` - Edit dialogs for nodes/edges

## Key Patterns

**Event-Driven Updates**: Model emits events on changes; canvas components subscribe and re-render.

**Batch Updates**: Use `model.beginBatch()` / `model.endBatch()` for bulk operations to avoid excessive events.

**Path Aliases**: Configure in `tsconfig.json`:
- `$lib/*` → `src/lib/*`
- `$core/*` → `src/core/*`
- `$canvas/*` → `src/canvas/*`
- `$components/*` → `src/components/*`

## Library Export

The npm package exports from `src/lib/index.ts`. The library bundles as ES module only, externalizing peer dependencies (`mermaid`, `d3`, `@dagrejs/dagre`).
