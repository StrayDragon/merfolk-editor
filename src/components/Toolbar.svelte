<script lang="ts">
  interface Props {
    showCode: boolean;
    showShapePanel?: boolean;
    onToggleCode: () => void;
    onToggleShapePanel?: () => void;
    onFitToView: () => void;
    onZoomIn: () => void;
    onZoomOut: () => void;
    onUndo?: () => void;
    onRedo?: () => void;
    canUndo?: boolean;
    canRedo?: boolean;
    onClearDraft?: () => void;
  }

  let {
    showCode,
    showShapePanel = true,
    onToggleCode,
    onToggleShapePanel,
    onFitToView,
    onZoomIn,
    onZoomOut,
    onUndo,
    onRedo,
    canUndo = false,
    canRedo = false,
    onClearDraft,
  }: Props = $props();
</script>

<div class="toolbar">
  <div class="toolbar-group">
    <span class="toolbar-title">Merfolk Editor</span>
  </div>

  <!-- 编辑工具 -->
  {#if onUndo || onRedo}
    <div class="toolbar-group">
      <button
        class="toolbar-btn"
        onclick={onUndo}
        title="撤销 (Ctrl+Z)"
        disabled={!canUndo}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M3 7v6h6"/>
          <path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13"/>
        </svg>
      </button>

      <button
        class="toolbar-btn"
        onclick={onRedo}
        title="重做 (Ctrl+Y)"
        disabled={!canRedo}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 7v6h-6"/>
          <path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3l3 2.7"/>
        </svg>
      </button>
    </div>
  {/if}

  <!-- 视图工具 -->
  <div class="toolbar-group">
    <button class="toolbar-btn" onclick={onZoomOut} title="缩小">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="11" cy="11" r="8"/>
        <line x1="21" y1="21" x2="16.65" y2="16.65"/>
        <line x1="8" y1="11" x2="14" y2="11"/>
      </svg>
    </button>

    <button class="toolbar-btn" onclick={onZoomIn} title="放大">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="11" cy="11" r="8"/>
        <line x1="21" y1="21" x2="16.65" y2="16.65"/>
        <line x1="11" y1="8" x2="11" y2="14"/>
        <line x1="8" y1="11" x2="14" y2="11"/>
      </svg>
    </button>

    <button class="toolbar-btn" onclick={onFitToView} title="适应视图">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/>
      </svg>
    </button>
  </div>

  <div class="toolbar-group">
    {#if onToggleShapePanel}
      <button
        class="toolbar-btn"
        class:active={showShapePanel}
        onclick={onToggleShapePanel}
        title={showShapePanel ? '隐藏形状面板' : '显示形状面板'}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="3" y="3" width="7" height="7"/>
          <rect x="14" y="3" width="7" height="7"/>
          <rect x="3" y="14" width="7" height="7"/>
          <rect x="14" y="14" width="7" height="7"/>
        </svg>
        <span>形状</span>
      </button>
    {/if}

    <button
      class="toolbar-btn"
      class:active={showCode}
      onclick={onToggleCode}
      title={showCode ? '隐藏代码' : '显示代码'}
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <polyline points="16 18 22 12 16 6"/>
        <polyline points="8 6 2 12 8 18"/>
      </svg>
      <span>代码</span>
    </button>

    {#if onClearDraft}
      <button
        class="toolbar-btn danger"
        onclick={onClearDraft}
        title="清除本地草稿，下次加载默认"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="3 6 5 6 21 6"/>
          <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
          <path d="M10 11v6"/>
          <path d="M14 11v6"/>
          <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
        </svg>
        <span>清除草稿</span>
      </button>
    {/if}
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

  .toolbar-btn:hover:not(:disabled) {
    background: #f5f5f5;
    border-color: #cccccc;
    color: #333333;
  }

  .toolbar-btn.active {
    background: #e3f2fd;
    border-color: #2196f3;
    color: #2196f3;
  }

  .toolbar-btn.danger {
    color: #b42318;
    border-color: #f2c0ba;
  }

  .toolbar-btn.danger:hover:not(:disabled) {
    background: #fdecea;
    border-color: #f5a19a;
    color: #8a1f11;
  }

  .toolbar-btn:disabled {
    opacity: 0.4;
    cursor: not-allowed;
    pointer-events: none;
  }

  .toolbar-btn svg {
    flex-shrink: 0;
  }
</style>
