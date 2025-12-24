<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import InteractiveCanvas from './InteractiveCanvas.svelte';
  import CodePanel from './CodePanel.svelte';
  import Toolbar from './Toolbar.svelte';
  import { SyncEngine } from '../core/sync/SyncEngine';

  interface Props {
    initialCode?: string;
    /** 代码变更回调（外部使用） */
    onCodeChange?: (code: string) => void;
    /** 画布编辑后延迟同步的时间（ms） */
    syncDelay?: number;
  }

  let { initialCode = '', onCodeChange, syncDelay = 1500 }: Props = $props();

  // State
  let code = $state('');
  let parseError = $state<string | null>(null);
  let showCode = $state(true);
  let selectedNodeId = $state<string | null>(null);

  // 画布编辑模式状态
  let isCanvasEditing = $state(false);
  let syncTimer: ReturnType<typeof setTimeout> | null = null;

  // 同步引擎
  const syncEngine = new SyncEngine({ debounceDelay: 300 });

  // 标记是否正在从画布同步（避免循环更新）
  let isSyncingFromCanvas = false;

  // Parse initial code
  onMount(() => {
    if (initialCode) {
      code = initialCode;
      syncEngine.updateFromCode(initialCode);
    }

    // 设置同步引擎回调
    syncEngine.setOnCodeChange((newCode) => {
      isSyncingFromCanvas = true;
      code = newCode;
      onCodeChange?.(newCode);
      // 使用 setTimeout 确保在下一个 tick 重置标记
      setTimeout(() => {
        isSyncingFromCanvas = false;
      }, 0);
    });
  });

  onDestroy(() => {
    syncEngine.destroy();
    if (syncTimer) {
      clearTimeout(syncTimer);
    }
  });

  /**
   * Handle code changes from editor
   */
  function handleCodeChange(newCode: string): void {
    // 如果是从画布同步来的，不需要再更新
    if (isSyncingFromCanvas) return;

    code = newCode;
    parseError = null;

    // 更新同步引擎
    try {
      syncEngine.updateFromCode(newCode);
    } catch (e) {
      // 解析错误会在画布渲染时处理
    }

    onCodeChange?.(newCode);
  }

  /**
   * Handle render error from canvas
   */
  function handleRenderError(error: string | null): void {
    parseError = error;
  }

  /**
   * Handle node selection
   */
  function handleNodeSelect(nodeId: string | null): void {
    selectedNodeId = nodeId;
  }

  /**
   * Handle node move (仅保存位置，不触发代码更新)
   */
  function handleNodeMove(nodeId: string, x: number, y: number): void {
    console.log(`[Editor] Node ${nodeId} moved to (${x}, ${y})`);
    // 更新同步引擎保存位置（不会触发代码更新）
    syncEngine.updateNodePosition(nodeId, x, y);
  }

  /**
   * 获取同步引擎（供外部使用）
   */
  export function getSyncEngine(): SyncEngine {
    return syncEngine;
  }

  /**
   * Toggle code panel visibility
   */
  function toggleCodePanel(): void {
    showCode = !showCode;
  }

  /**
   * Canvas controls
   */
  let canvasRef: InteractiveCanvas | null = null;

  function fitToView(): void {
    canvasRef?.fitToView();
  }

  function zoomIn(): void {
    canvasRef?.zoomIn();
  }

  function zoomOut(): void {
    canvasRef?.zoomOut();
  }

  /**
   * 删除节点
   */
  function handleDeleteNode(nodeId: string): void {
    try {
      syncEngine.removeNode(nodeId);
      if (selectedNodeId === nodeId) {
        selectedNodeId = null;
      }
    } catch (error) {
      console.error('[Editor] Failed to delete node:', error);
    }
  }

  /**
   * 添加节点（从画布右键菜单触发）
   */
  function handleAddNode(x: number, y: number): void {
    try {
      // 生成唯一节点 ID
      const nodeId = `node_${Date.now()}`;
      syncEngine.addNode(nodeId, `New Node`, { x, y });
    } catch (error) {
      console.error('[Editor] Failed to add node:', error);
    }
  }

  /**
   * 编辑节点（打开节点编辑对话框）
   */
  function handleEditNode(nodeId: string): void {
    // TODO: 实现节点编辑对话框
    console.log('[Editor] Edit node:', nodeId);
    const newText = prompt('输入新的节点文本:');
    if (newText !== null && newText.trim()) {
      try {
        syncEngine.updateNodeText(nodeId, newText.trim());
      } catch (error) {
        console.error('[Editor] Failed to update node text:', error);
      }
    }
  }

  /**
   * 画布编辑开始
   * 进入编辑模式，遮盖代码区域
   */
  function handleCanvasEditStart(): void {
    isCanvasEditing = true;
    // 清除之前的定时器
    if (syncTimer) {
      clearTimeout(syncTimer);
      syncTimer = null;
    }
  }

  /**
   * 画布编辑结束
   * 延迟同步代码
   */
  function handleCanvasEditEnd(): void {
    // 设置延迟同步定时器
    if (syncTimer) {
      clearTimeout(syncTimer);
    }

    syncTimer = setTimeout(() => {
      isCanvasEditing = false;
      syncTimer = null;
    }, syncDelay);
  }
</script>

<div class="editor">
  <Toolbar
    {showCode}
    onToggleCode={toggleCodePanel}
    onFitToView={fitToView}
    onZoomIn={zoomIn}
    onZoomOut={zoomOut}
  />

  <div class="editor-content">
    <div class="canvas-container" class:full-width={!showCode}>
      <InteractiveCanvas
        bind:this={canvasRef}
        {code}
        onError={handleRenderError}
        onNodeSelect={handleNodeSelect}
        onNodeMove={handleNodeMove}
        onDeleteNode={handleDeleteNode}
        onAddNode={handleAddNode}
        onEditNode={handleEditNode}
        onEditStart={handleCanvasEditStart}
        onEditEnd={handleCanvasEditEnd}
      />
    </div>

    {#if showCode}
      <div class="code-container" class:editing-overlay={isCanvasEditing}>
        <CodePanel
          {code}
          error={parseError}
          onCodeChange={handleCodeChange}
        />
        <!-- 编辑遮盖层 -->
        {#if isCanvasEditing}
          <div class="code-overlay">
            <div class="overlay-content">
              <div class="overlay-icon">🎨</div>
              <div class="overlay-text">正在编辑画布...</div>
              <div class="overlay-hint">编辑完成后将自动同步代码</div>
            </div>
          </div>
        {/if}
      </div>
    {/if}
  </div>
</div>

<style>
  .editor {
    display: flex;
    flex-direction: column;
    width: 100%;
    height: 100%;
    background: #f5f5f5;
  }

  .editor-content {
    display: flex;
    flex: 1;
    overflow: hidden;
  }

  .canvas-container {
    flex: 1;
    min-width: 0;
    background: #ffffff;
    border-right: 1px solid #e0e0e0;
  }

  .canvas-container.full-width {
    border-right: none;
  }

  .code-container {
    position: relative;
    width: 400px;
    min-width: 300px;
    max-width: 600px;
    display: flex;
    flex-direction: column;
  }

  .code-container.editing-overlay {
    pointer-events: none;
  }

  /* 代码区遮盖层 */
  .code-overlay {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(30, 30, 30, 0.85);
    backdrop-filter: blur(4px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10;
  }

  .overlay-content {
    text-align: center;
    color: #ffffff;
    padding: 24px;
  }

  .overlay-icon {
    font-size: 48px;
    margin-bottom: 16px;
    animation: pulse 2s ease-in-out infinite;
  }

  .overlay-text {
    font-size: 16px;
    font-weight: 500;
    margin-bottom: 8px;
  }

  .overlay-hint {
    font-size: 12px;
    color: #888888;
  }

  @keyframes pulse {
    0%, 100% { opacity: 1; transform: scale(1); }
    50% { opacity: 0.7; transform: scale(1.05); }
  }
</style>
