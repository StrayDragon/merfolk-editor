<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import InteractiveCanvas from './InteractiveCanvas.svelte';
  import CodePanel from './CodePanel.svelte';
  import Toolbar from './Toolbar.svelte';
  import NodeEditDialog from './NodeEditDialog.svelte';
  import EdgeAddDialog from './EdgeAddDialog.svelte';
  import { SyncEngine } from '../core/sync/SyncEngine';
  import type { ShapeType, StrokeType, ArrowType } from '$core/model/types';

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

  // 对话框状态
  let editDialogState = $state<{
    visible: boolean;
    nodeId: string;
    text: string;
    shape: ShapeType;
  } | null>(null);

  let edgeDialogState = $state<{
    visible: boolean;
    sourceNodeId: string;
  } | null>(null);

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

    // 全局键盘事件监听
    document.addEventListener('keydown', handleGlobalKeyDown);
  });

  onDestroy(() => {
    syncEngine.destroy();
    if (syncTimer) {
      clearTimeout(syncTimer);
    }
    document.removeEventListener('keydown', handleGlobalKeyDown);
  });

  /**
   * 全局键盘事件处理
   */
  function handleGlobalKeyDown(e: KeyboardEvent): void {
    // 如果焦点在输入框或编辑器中，不处理快捷键
    const target = e.target as HTMLElement;
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
      return;
    }

    // Ctrl+Z / Cmd+Z: 撤销
    if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
      e.preventDefault();
      handleUndo();
      return;
    }

    // Ctrl+Y / Cmd+Shift+Z: 重做
    if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
      e.preventDefault();
      handleRedo();
      return;
    }
  }

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
   * 撤销
   */
  function handleUndo(): void {
    syncEngine.undo();
  }

  /**
   * 重做
   */
  function handleRedo(): void {
    syncEngine.redo();
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
   * 删除边
   */
  function handleDeleteEdge(edgeId: string, _sourceId: string, _targetId: string): void {
    try {
      syncEngine.removeEdge(edgeId);
    } catch (error) {
      console.error('[Editor] Failed to delete edge:', error);
    }
  }

  /**
   * 编辑边文本（打开对话框）
   */
  function handleEditEdge(edgeId: string, _sourceId: string, _targetId: string, currentText?: string): void {
    // 使用简单的 prompt 对话框临时实现
    const newText = prompt('编辑连接文本:', currentText || '');
    if (newText !== null) {
      try {
        syncEngine.updateEdgeText(edgeId, newText);
      } catch (error) {
        console.error('[Editor] Failed to update edge text:', error);
      }
    }
  }

  /**
   * 添加节点（从画布右键菜单触发）
   */
  function handleAddNode(x: number, y: number, shape: ShapeType = 'rect'): void {
    try {
      // 生成唯一节点 ID
      const nodeId = `node_${Date.now()}`;
      syncEngine.addNode(nodeId, `新节点`, { x, y }, shape);
      // 选中新节点
      selectedNodeId = nodeId;
    } catch (error) {
      console.error('[Editor] Failed to add node:', error);
    }
  }

  /**
   * 编辑节点（打开节点编辑对话框）
   */
  function handleEditNode(nodeId: string): void {
    const model = syncEngine.getModel();
    const node = model.getNode(nodeId);
    if (node) {
      editDialogState = {
        visible: true,
        nodeId,
        text: node.text,
        shape: node.shape,
      };
    }
  }

  /**
   * 确认编辑节点
   */
  function handleEditNodeConfirm(nodeId: string, text: string, shape: ShapeType): void {
    try {
      syncEngine.updateNode(nodeId, text, shape);
    } catch (error) {
      console.error('[Editor] Failed to update node:', error);
    }
    editDialogState = null;
  }

  /**
   * 取消编辑节点
   */
  function handleEditNodeCancel(): void {
    editDialogState = null;
  }

  /**
   * 添加边（打开边添加对话框）
   */
  function handleAddEdge(sourceNodeId: string): void {
    edgeDialogState = {
      visible: true,
      sourceNodeId,
    };
  }

  /**
   * 确认添加边
   */
  function handleAddEdgeConfirm(
    sourceId: string,
    targetId: string,
    text: string,
    stroke: StrokeType,
    arrowType: ArrowType
  ): void {
    try {
      // 特殊情况：创建新节点并连接
      if (targetId === '__new__') {
        // 生成新节点 ID
        const newNodeId = generateNewNodeId();
        // 先创建新节点
        syncEngine.addNode(newNodeId, '新节点', 'rect');
        // 然后添加边
        syncEngine.addEdge(sourceId, newNodeId, text || undefined, stroke, arrowType);
      } else {
        syncEngine.addEdge(sourceId, targetId, text || undefined, stroke, arrowType);
      }
    } catch (error) {
      console.error('[Editor] Failed to add edge:', error);
    }
    edgeDialogState = null;
  }

  /**
   * 生成新节点 ID
   */
  function generateNewNodeId(): string {
    const existingIds = syncEngine.getNodesForEdgeDialog().map(n => n.id);
    // 生成一个简单的字母 ID (A, B, C, ... Z, AA, AB, ...)
    let id = 'N1';
    let counter = 1;
    while (existingIds.includes(id)) {
      counter++;
      id = `N${counter}`;
    }
    return id;
  }

  /**
   * 取消添加边
   */
  function handleAddEdgeCancel(): void {
    edgeDialogState = null;
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
    onUndo={handleUndo}
    onRedo={handleRedo}
    canUndo={syncEngine.canUndo()}
    canRedo={syncEngine.canRedo()}
  />

  <div class="editor-content">
    <div
      class="canvas-container"
      class:full-width={!showCode}
    >
      <InteractiveCanvas
        bind:this={canvasRef}
        {code}
        onError={handleRenderError}
        onNodeSelect={handleNodeSelect}
        onNodeMove={handleNodeMove}
        onDeleteNode={handleDeleteNode}
        onAddNode={handleAddNode}
        onEditNode={handleEditNode}
        onAddEdge={handleAddEdge}
        onDeleteEdge={handleDeleteEdge}
        onEditEdge={handleEditEdge}
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

<!-- 节点编辑对话框 -->
{#if editDialogState?.visible}
  <NodeEditDialog
    nodeId={editDialogState.nodeId}
    initialText={editDialogState.text}
    initialShape={editDialogState.shape}
    onConfirm={handleEditNodeConfirm}
    onCancel={handleEditNodeCancel}
  />
{/if}

<!-- 边添加对话框 -->
{#if edgeDialogState?.visible}
  <EdgeAddDialog
    sourceNodeId={edgeDialogState.sourceNodeId}
    nodes={syncEngine.getNodesForEdgeDialog()}
    onConfirm={handleAddEdgeConfirm}
    onCancel={handleAddEdgeCancel}
  />
{/if}

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
