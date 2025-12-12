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
  }

  let { initialCode = '', onCodeChange }: Props = $props();

  // State
  let code = $state('');
  let parseError = $state<string | null>(null);
  let showCode = $state(true);
  let selectedNodeId = $state<string | null>(null);

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
  function handleRenderError(error: string): void {
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

  function resetZoom(): void {
    canvasRef?.resetZoom();
  }

  // 节点和边计数器（用于生成唯一 ID）
  let nodeCounter = 0;
  let edgeCounter = 0;

  /**
   * 添加新节点
   */
  function handleAddNode(): void {
    const newId = `node${++nodeCounter}`;
    syncEngine.addNode({
      id: newId,
      text: `New Node ${nodeCounter}`,
      shape: 'rect',
      cssClasses: [],
    });
  }

  /**
   * 切换边创建模式
   */
  let edgeCreationMode = false;

  function handleToggleEdgeMode(): void {
    edgeCreationMode = !edgeCreationMode;
    canvasRef?.setEdgeCreationMode(edgeCreationMode);
  }

  /**
   * 添加边
   */
  function handleAddEdge(sourceId: string, targetId: string): void {
    const newId = `edge${++edgeCounter}`;
    syncEngine.addEdge({
      id: newId,
      source: sourceId,
      target: targetId,
      stroke: 'normal',
      arrowStart: 'none',
      arrowEnd: 'arrow',
    });
  }

  /**
   * 删除节点
   */
  function handleDeleteNode(nodeId: string): void {
    syncEngine.removeNode(nodeId);
    if (selectedNodeId === nodeId) {
      selectedNodeId = null;
    }
  }

  /**
   * 删除选中的节点（工具栏按钮用）
   */
  function handleDeleteSelected(): void {
    if (selectedNodeId) {
      handleDeleteNode(selectedNodeId);
    }
  }
</script>

<div class="editor">
  <Toolbar
    {showCode}
    onToggleCode={toggleCodePanel}
    onFitToView={fitToView}
    onZoomIn={zoomIn}
    onZoomOut={zoomOut}
    onAddNode={handleAddNode}
    onAddEdge={handleToggleEdgeMode}
    onDeleteSelected={handleDeleteSelected}
    hasSelection={selectedNodeId !== null}
    edgeCreationMode={edgeCreationMode}
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
        onAddEdge={handleAddEdge}
      />
    </div>

    {#if showCode}
      <div class="code-container">
        <CodePanel
          {code}
          error={parseError}
          onCodeChange={handleCodeChange}
        />
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
    width: 400px;
    min-width: 300px;
    max-width: 600px;
    display: flex;
    flex-direction: column;
  }
</style>
