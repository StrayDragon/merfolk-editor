<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { CanvasRenderer } from '../canvas/CanvasRenderer';
  import type { FlowchartModel } from '../core/model/FlowchartModel';
  import type { FlowNode } from '../core/model/Node';
  import type { Position } from '../core/model/types';

  interface Props {
    model: FlowchartModel;
    onModelChange?: () => void;
  }

  let { model, onModelChange }: Props = $props();

  let containerEl: HTMLDivElement;
  let renderer: CanvasRenderer | null = null;

  // Track model changes
  let prevModel: FlowchartModel | null = null;

  onMount(() => {
    // Initialize renderer
    renderer = new CanvasRenderer({
      container: containerEl,
    });

    // Set up callbacks
    renderer.setCallbacks({
      onNodeClick: handleNodeClick,
      onNodeDragEnd: handleNodeDragEnd,
      onCanvasClick: handleCanvasClick,
    });

    // Initial render
    if (model) {
      renderer.setModel(model);
      renderer.render();
    }

    // Handle resize
    const resizeObserver = new ResizeObserver(() => {
      if (renderer && containerEl) {
        const rect = containerEl.getBoundingClientRect();
        renderer.resize(rect.width, rect.height);
      }
    });
    resizeObserver.observe(containerEl);

    return () => {
      resizeObserver.disconnect();
    };
  });

  onDestroy(() => {
    renderer?.destroy();
  });

  // Re-render when model changes
  $effect(() => {
    if (renderer && model && model !== prevModel) {
      prevModel = model;
      renderer.setModel(model);
      renderer.render();
    }
  });

  function handleNodeClick(node: FlowNode, _event: MouseEvent): void {
    console.log('Node clicked:', node.id);
  }

  function handleNodeDragEnd(node: FlowNode, position: Position): void {
    // Update node position in model
    model.updateNode(node.id, { position });
    onModelChange?.();
  }

  function handleCanvasClick(_event: MouseEvent): void {
    // Clear selection or other actions
  }

  // Public methods
  export function fitToView(): void {
    renderer?.fitToView();
  }

  export function zoomIn(): void {
    const current = renderer?.getZoomLevel() ?? 1;
    renderer?.zoomTo(Math.min(current * 1.2, 4));
  }

  export function zoomOut(): void {
    const current = renderer?.getZoomLevel() ?? 1;
    renderer?.zoomTo(Math.max(current / 1.2, 0.1));
  }

  export function resetZoom(): void {
    renderer?.resetZoom();
  }
</script>

<div class="canvas" bind:this={containerEl}></div>

<style>
  .canvas {
    width: 100%;
    height: 100%;
    overflow: hidden;
  }

  .canvas :global(svg) {
    display: block;
  }

  /* Node styles */
  .canvas :global(.node) {
    cursor: pointer;
  }

  .canvas :global(.node:hover .node-shape) {
    filter: brightness(0.95);
  }

  .canvas :global(.node.selected .node-shape) {
    stroke: #2196f3;
    stroke-width: 3px;
  }

  .canvas :global(.node.dragging) {
    cursor: grabbing;
  }

  /* Edge styles */
  .canvas :global(.edge) {
    cursor: pointer;
  }

  .canvas :global(.edge:hover .edge-path) {
    stroke-width: 3px;
  }

  .canvas :global(.edge.selected .edge-path) {
    stroke: #2196f3;
  }

  /* Animation for edges */
  @keyframes -global-dash {
    to {
      stroke-dashoffset: -20;
    }
  }
</style>
