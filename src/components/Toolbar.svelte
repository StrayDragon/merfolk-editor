<script lang="ts">
  interface Props {
    showCode: boolean;
    onToggleCode: () => void;
    onFitToView: () => void;
    onZoomIn: () => void;
    onZoomOut: () => void;
    onDeleteSelected?: () => void;
    hasSelection?: boolean;
  }

  let {
    showCode,
    onToggleCode,
    onFitToView,
    onZoomIn,
    onZoomOut,
    onDeleteSelected,
    hasSelection = false,
  }: Props = $props();
</script>

<div class="toolbar">
  <div class="toolbar-group">
    <span class="toolbar-title">Merfolk Editor</span>
  </div>

  <!-- 编辑工具 -->
  <div class="toolbar-group">
    {#if onDeleteSelected}
      <button
        class="toolbar-btn"
        class:disabled={!hasSelection}
        onclick={onDeleteSelected}
        disabled={!hasSelection}
        title="Delete Selected"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="3 6 5 6 21 6"/>
          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
        </svg>
          <span>Delete</span>
      </button>
    {/if}
  </div>

  <!-- 视图工具 -->
  <div class="toolbar-group">
    <button class="toolbar-btn" onclick={onZoomOut} title="Zoom Out">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="11" cy="11" r="8"/>
        <line x1="21" y1="21" x2="16.65" y2="16.65"/>
        <line x1="8" y1="11" x2="14" y2="11"/>
      </svg>
    </button>

    <button class="toolbar-btn" onclick={onZoomIn} title="Zoom In">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="11" cy="11" r="8"/>
        <line x1="21" y1="21" x2="16.65" y2="16.65"/>
        <line x1="11" y1="8" x2="11" y2="14"/>
        <line x1="8" y1="11" x2="14" y2="11"/>
      </svg>
    </button>

    <button class="toolbar-btn" onclick={onFitToView} title="Fit to View">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/>
      </svg>
    </button>
  </div>

  <div class="toolbar-group">
    <button
      class="toolbar-btn"
      class:active={showCode}
      onclick={onToggleCode}
      title={showCode ? 'Hide Code' : 'Show Code'}
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <polyline points="16 18 22 12 16 6"/>
        <polyline points="8 6 2 12 8 18"/>
      </svg>
      <span>Code</span>
    </button>
  </div>
</div>

<style>
  .toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 16px;
    background: #ffffff;
    border-bottom: 1px solid #e0e0e0;
    gap: 16px;
  }

  .toolbar-group {
    display: flex;
    align-items: center;
    gap: 4px;
  }

  .toolbar-title {
    font-size: 14px;
    font-weight: 600;
    color: #333333;
  }

  .toolbar-btn {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 6px 10px;
    border: 1px solid #e0e0e0;
    border-radius: 4px;
    background: #ffffff;
    color: #666666;
    font-size: 12px;
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .toolbar-btn:hover {
    background: #f5f5f5;
    border-color: #cccccc;
    color: #333333;
  }

  .toolbar-btn.active {
    background: #e3f2fd;
    border-color: #2196f3;
    color: #2196f3;
  }

  .toolbar-btn.disabled,
  .toolbar-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    pointer-events: none;
  }

  .toolbar-btn svg {
    flex-shrink: 0;
  }
</style>
