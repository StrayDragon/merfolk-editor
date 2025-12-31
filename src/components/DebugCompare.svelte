<script lang="ts">
  import MermaidCanvas from './MermaidCanvas.svelte';
  import InteractiveCanvas from './InteractiveCanvas.svelte';

  interface Props {
    code: string;
  }

  let { code }: Props = $props();

  let mermaidError = $state<string | null>(null);
  let interactiveError = $state<string | null>(null);

  let interactiveCanvasRef: InteractiveCanvas | null = null;

  function handleMermaidError(error: string): void {
    mermaidError = error;
  }

  function handleInteractiveError(error: string | null): void {
    interactiveError = error;
  }

  function handleNodeSelect(nodeId: string | null): void {
    console.log('[DebugCompare] Node selected:', nodeId);
  }

  // Zoom controls for interactive canvas
  function fitToView(): void {
    interactiveCanvasRef?.fitToView();
  }

  function zoomIn(): void {
    interactiveCanvasRef?.zoomIn();
  }

  function zoomOut(): void {
    interactiveCanvasRef?.zoomOut();
  }
</script>

<div class="debug-compare">
  <div class="panel">
    <div class="panel-header">
      <span class="panel-title">Mermaid Native</span>
      <span class="panel-badge reference">Reference (Read-only)</span>
    </div>
    <div class="panel-content">
      <MermaidCanvas
        {code}
        onError={handleMermaidError}
      />
      {#if mermaidError}
        <div class="error-overlay">{mermaidError}</div>
      {/if}
    </div>
  </div>

  <div class="divider"></div>

  <div class="panel">
    <div class="panel-header">
      <span class="panel-title">Interactive Canvas</span>
      <span class="panel-badge editable">Editable</span>
      <div class="panel-controls">
        <button onclick={zoomOut} title="Zoom Out">−</button>
        <button onclick={fitToView} title="Fit to View">⊡</button>
        <button onclick={zoomIn} title="Zoom In">+</button>
      </div>
    </div>
    <div class="panel-content">
      <InteractiveCanvas
        bind:this={interactiveCanvasRef}
        {code}
        onError={handleInteractiveError}
        onNodeSelect={handleNodeSelect}
      />
      {#if interactiveError}
        <div class="error-overlay">{interactiveError}</div>
      {/if}
    </div>
  </div>
</div>

<style>
  .debug-compare {
    display: flex;
    width: 100%;
    height: 100%;
    background: #f0f0f0;
  }

  .panel {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-width: 0;
    position: relative;
  }

  .panel-header {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 12px;
    background: #333;
    color: white;
    font-size: 14px;
  }

  .panel-title {
    font-weight: 600;
  }

  .panel-badge {
    padding: 2px 8px;
    border-radius: 4px;
    font-size: 11px;
    font-weight: 500;
  }

  .panel-badge.reference {
    background: #4caf50;
    color: white;
  }

  .panel-badge.editable {
    background: #2196f3;
    color: white;
  }

  .panel-controls {
    margin-left: auto;
    display: flex;
    gap: 4px;
  }

  .panel-controls button {
    width: 28px;
    height: 28px;
    border: none;
    background: rgba(255, 255, 255, 0.2);
    color: white;
    border-radius: 4px;
    cursor: pointer;
    font-size: 16px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .panel-controls button:hover {
    background: rgba(255, 255, 255, 0.3);
  }

  .panel-content {
    flex: 1;
    overflow: hidden;
    background: white;
    position: relative;
  }

  .divider {
    width: 4px;
    background: #666;
    cursor: col-resize;
  }

  .error-overlay {
    position: absolute;
    bottom: 10px;
    left: 10px;
    right: 10px;
    color: #d32f2f;
    background: #ffebee;
    padding: 10px;
    border-radius: 4px;
    font-size: 12px;
    text-align: center;
  }
</style>
