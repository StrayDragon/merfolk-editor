<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import InteractiveCanvas from './InteractiveCanvas.svelte';
  import CodePanel from './CodePanel.svelte';
  import Toolbar from './Toolbar.svelte';
  import NodeEditDialog from './NodeEditDialog.svelte';
  import EdgeAddDialog from './EdgeAddDialog.svelte';
  import EdgeEditDialog from './EdgeEditDialog.svelte';
  import { SyncEngine, type SyncEngineOptions } from '../core/sync/SyncEngine';
  import type { ShapeType, StrokeType, ArrowType } from '../core/model/types';
  import { detectDiagramType, type DiagramTypeInfo } from '../core/utils/DiagramTypeDetector';
  import type { CodeChangeMeta, EditorStrings, SetCodeOptions } from '../lib/types';
  import type { MermaidAPI } from '../lib/types';
  import type { MermaidConfig } from 'mermaid';

  interface Props {
    initialCode?: string;
    /** 代码变更回调(外部使用) */
    onCodeChange?: (code: string, meta: CodeChangeMeta) => void;
    /** 清除本地草稿 */
    onClearDraft?: () => void;
    /** 画布编辑后延迟同步的时间(ms) */
    syncDelay?: number;
    /** 同步引擎配置 */
    sync?: SyncEngineOptions;
    /** 只读模式 */
    readOnly?: boolean;
    /** 初始是否显示代码面板 */
    showCodePanel?: boolean;
    /** UI 文案覆写 */
    strings?: EditorStrings;
    /** Mermaid 实例 */
    mermaid?: MermaidAPI;
    /** Mermaid 初始化配置 */
    mermaidConfig?: MermaidConfig;
    /** 是否初始化 Mermaid */
    initializeMermaid?: boolean;
    /** 尺寸变化时自动适配视图 */
    autoFitOnResize?: boolean;
  }

  let {
    initialCode = '',
    onCodeChange,
    onClearDraft,
    syncDelay = 1500,
    sync,
    readOnly = false,
    showCodePanel: showCodePanelProp = true,
    strings,
    mermaid,
    mermaidConfig,
    initializeMermaid,
    autoFitOnResize = true,
  }: Props = $props();

  const defaultStrings: Required<EditorStrings> = {
    toolbar: {
      title: 'Merfolk Editor',
      code: '代码',
      shapes: '形状',
      clearDraft: '清除草稿',
      zoomIn: '放大',
      zoomOut: '缩小',
      fitToView: '适应视图',
    },
    codePanel: {
      title: 'Mermaid Code',
      placeholder: 'Enter Mermaid flowchart code...',
      errorLabel: 'Error',
    },
    overlay: {
      editingTitle: '正在编辑画布...',
      editingText: '正在编辑画布...',
      editingHint: '编辑完成后将自动同步代码',
    },
    helpPanel: {
      title: '快捷键帮助',
      nodeSection: '节点操作',
      edgeSection: '连线操作',
      viewSection: '视图操作',
      readonlyHintTitle: '当前图类型为预览模式',
      readonlyHintText: '请使用代码面板编辑',
    },
  };

  const toolbarStrings = $derived({
    ...defaultStrings.toolbar,
    ...(strings?.toolbar ?? {}),
  });
  const codePanelStrings = $derived({
    ...defaultStrings.codePanel,
    ...(strings?.codePanel ?? {}),
  });
  const overlayStrings = $derived({
    ...defaultStrings.overlay,
    ...(strings?.overlay ?? {}),
  });
  const helpPanelStrings = $derived({
    ...defaultStrings.helpPanel,
    ...(strings?.helpPanel ?? {}),
  });

  // State
  let code = $state('');
  let parseError = $state<string | null>(null);
  let showCode = $state(true);
  let selectedNodeId = $state<string | null>(null);

  // 图类型检测
  let diagramTypeInfo = $state<DiagramTypeInfo>({
    type: 'flowchart',
    displayName: 'Flowchart',
    isEditable: true,
    description: '流程图',
  });

  // 是否为可编辑模式
  const isEditable = $derived(diagramTypeInfo.isEditable && !readOnly);

  // 画布编辑模式状态
  let isCanvasEditing = $state(false);
  let syncTimer: ReturnType<typeof setTimeout> | null = null;
  let interactionError = $state<string | null>(null);
  let interactionErrorTimer: ReturnType<typeof setTimeout> | null = null;

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

  // 边编辑对话框状态
  let edgeEditDialogState = $state<{
    visible: boolean;
    edgeId: string;
    sourceId: string;
    targetId: string;
    text: string;
    stroke: StrokeType;
    arrow: ArrowType;
  } | null>(null);

  // 同步引擎
  const syncEngine = (() => {
    const syncOptions = sync ?? {};
    return new SyncEngine({ debounceDelay: 300, includeMerfolkMeta: true, ...syncOptions });
  })();

  // 标记是否正在从画布同步(避免循环更新)
  let isSyncingFromCanvas = false;

  // Parse initial code
  onMount(() => {
    if (initialCode) {
      applyCodeChange(initialCode, { source: 'external', silent: true }, false);
    }

    // 设置同步引擎回调
    syncEngine.setOnCodeChange((newCode) => {
      isSyncingFromCanvas = true;
      code = newCode;
      onCodeChange?.(newCode, { source: 'canvas', silent: false });
      // 使用 setTimeout 确保在下一个 tick 重置标记
      setTimeout(() => {
        isSyncingFromCanvas = false;
      }, 0);
    });

  });

  $effect.pre(() => {
    showCode = showCodePanelProp ?? true;
  });

  onDestroy(() => {
    syncEngine.destroy();
    if (syncTimer) {
      clearTimeout(syncTimer);
    }
    if (interactionErrorTimer) {
      clearTimeout(interactionErrorTimer);
    }
  });

  /**
   * Handle code changes from editor
   */
  function applyCodeChange(newCode: string, meta: CodeChangeMeta, notify: boolean): void {
    code = newCode;
    parseError = null;

    // 检测图类型
    diagramTypeInfo = detectDiagramType(newCode);

    // 更新同步引擎(仅 flowchart 可编辑)
    if (diagramTypeInfo.isEditable) {
      try {
        syncEngine.updateFromCode(newCode);
      } catch (e) {
        // 解析错误会在画布渲染时处理
      }
    }

    if (notify && !meta.silent) {
      onCodeChange?.(newCode, meta);
    }
  }

  function handleCodeChange(newCode: string): void {
    // 如果是从画布同步来的,不需要再更新
    if (isSyncingFromCanvas) return;
    applyCodeChange(newCode, { source: 'code', silent: false }, true);
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
   * 获取同步引擎(供外部使用)
   */
  export function getSyncEngine(): SyncEngine {
    return syncEngine;
  }

  /**
   * 获取当前 Mermaid 代码
   */
  export function getCode(): string {
    return code;
  }

  /**
   * 外部设置 Mermaid 代码
   */
  export function setCode(newCode: string, options: SetCodeOptions = {}): void {
    const notify = resolveNotify(options);
    const meta: CodeChangeMeta = {
      source: options.source ?? 'external',
      silent: !notify,
    };
    applyCodeChange(newCode, meta, notify);
  }

  /**
   * Toggle code panel visibility
   */
  export function toggleCodePanel(): void {
    showCode = !showCode;
  }

  /**
   * Canvas controls
   */
  let canvasRef: InteractiveCanvas | null = null;

  export function fitToView(): void {
    canvasRef?.fitToView();
  }

  export function zoomIn(): void {
    canvasRef?.zoomIn();
  }

  export function zoomOut(): void {
    canvasRef?.zoomOut();
  }

  export function resetZoom(): void {
    canvasRef?.resetZoom();
  }

  export function refresh(): void {
    canvasRef?.refresh();
  }

  export function resize(): void {
    canvasRef?.resize();
  }

  export function showCodePanel(): void {
    showCode = true;
  }

  export function hideCodePanel(): void {
    showCode = false;
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
   * 在边上插入节点
   * 将 A --> B 变为 A --> NewNode --> B
   */
  function handleInsertNodeOnEdge(sourceId: string, targetId: string, shape: ShapeType): void {
    try {
      syncEngine.insertNodeOnEdge(sourceId, targetId, shape);
    } catch (error) {
      console.error('[Editor] Failed to insert node on edge:', error);
    }
  }

  /**
   * 编辑边文本(打开对话框)
   */
  function handleEditEdge(edgeId: string, sourceId: string, targetId: string, currentText?: string): void {
    // 获取边的当前属性
    const edge = syncEngine.getEdgeById(edgeId);
    edgeEditDialogState = {
      visible: true,
      edgeId,
      sourceId,
      targetId,
      text: currentText || '',
      stroke: edge?.stroke || 'normal',
      arrow: edge?.arrowEnd || 'arrow',
    };
  }

  /**
   * 确认编辑边
   */
  function handleEditEdgeConfirm(
    edgeId: string,
    text: string,
    stroke: StrokeType,
    arrow: ArrowType
  ): void {
    try {
      syncEngine.updateEdge(edgeId, { text, stroke, arrowEnd: arrow });
    } catch (error) {
      console.error('[Editor] Failed to update edge:', error);
    }
    edgeEditDialogState = null;
  }

  /**
   * 取消编辑边
   */
  function handleEditEdgeCancel(): void {
    edgeEditDialogState = null;
  }

  /**
   * 添加节点(从画布右键菜单触发)
   */
  function handleAddNode(x: number, y: number, shape: ShapeType = 'rect'): void {
    try {
      // 生成唯一节点 ID
      const nodeId = `node_${Date.now()}`;
      syncEngine.addNode(nodeId, `新节点`, { x, y }, shape);
      // 选中新节点
      selectedNodeId = nodeId;
      // 通知画布聚焦到新节点
      canvasRef?.focusOnNode(nodeId);
    } catch (error) {
      console.error('[Editor] Failed to add node:', error);
    }
  }

  /**
   * 编辑节点(打开节点编辑对话框)
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
   * 添加边(打开边添加对话框)
   */
  function handleAddEdge(sourceNodeId: string): void {
    edgeDialogState = {
      visible: true,
      sourceNodeId,
    };
  }

  /**
   * 拖拽创建边(直接创建,不打开对话框)
   */
  function handleDragEdgeCreate(sourceId: string, targetId: string): void {
    try {
      if (!ensureEdgeEndpoints(sourceId, targetId)) {
        return;
      }
      syncEngine.addEdge(sourceId, targetId, undefined, 'normal', 'arrow');
    } catch (error) {
      console.error('[Editor] Failed to create edge via drag:', error);
      showInteractionError('创建连线失败，请检查 Mermaid 语法或节点 ID');
    }
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
      const canCreateEdge = targetId === '__new__' || ensureEdgeEndpoints(sourceId, targetId);
      if (!canCreateEdge) {
        edgeDialogState = null;
        return;
      }
      // 特殊情况:创建新节点并连接
      if (targetId === '__new__') {
        // 生成新节点 ID
        const newNodeId = generateNewNodeId();
        // 先创建新节点
        syncEngine.addNode(newNodeId, '新节点', undefined, 'rect');
        // 然后添加边
        syncEngine.addEdge(sourceId, newNodeId, text || undefined, stroke, arrowType);
      } else {
        syncEngine.addEdge(sourceId, targetId, text || undefined, stroke, arrowType);
      }
    } catch (error) {
      console.error('[Editor] Failed to add edge:', error);
      showInteractionError('创建连线失败，请检查 Mermaid 语法或节点 ID');
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

  function showInteractionError(message: string): void {
    interactionError = message;
    if (interactionErrorTimer) {
      clearTimeout(interactionErrorTimer);
    }
    interactionErrorTimer = setTimeout(() => {
      interactionError = null;
      interactionErrorTimer = null;
    }, 2500);
  }

  function ensureEdgeEndpoints(sourceId: string, targetId: string): boolean {
    const model = syncEngine.getModel();
    if (model.getNode(sourceId) && model.getNode(targetId)) {
      return true;
    }

    try {
      syncEngine.updateFromCode(code);
    } catch (error) {
      showInteractionError('当前 Mermaid 语法无法解析，已取消连线操作');
      return false;
    }

    const refreshedModel = syncEngine.getModel();
    if (!refreshedModel.getNode(sourceId) || !refreshedModel.getNode(targetId)) {
      showInteractionError('无法创建连接：节点未在可编辑模型中');
      return false;
    }

    return true;
  }

  /**
   * 画布编辑开始
   * 进入编辑模式,遮盖代码区域
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

  function resolveNotify(options: SetCodeOptions): boolean {
    if (options.notify !== undefined) {
      return options.notify;
    }
    if (options.silent !== undefined) {
      return !options.silent;
    }
    return false;
  }
</script>

<div
  class="editor merfolk-editor"
>
  <Toolbar
    {showCode}
    onToggleCode={toggleCodePanel}
    onClearDraft={onClearDraft}
    onFitToView={fitToView}
    onZoomIn={zoomIn}
    onZoomOut={zoomOut}
    strings={toolbarStrings}
  />

  <!-- 图类型提示 -->
  {#if !isEditable}
    <div class="diagram-type-banner">
      <div class="banner-icon">📊</div>
      <div class="banner-content">
        <div class="banner-type">{diagramTypeInfo.displayName}</div>
        <div class="banner-desc">{diagramTypeInfo.description}</div>
      </div>
    </div>
  {/if}

  <div class="editor-content">
    <div
      class="canvas-container"
      class:full-width={!showCode}
    >
      <InteractiveCanvas
        bind:this={canvasRef}
        {code}
        readonly={!isEditable}
        onError={handleRenderError}
        onNodeSelect={isEditable ? handleNodeSelect : undefined}
        onDeleteNode={isEditable ? handleDeleteNode : undefined}
        onAddNode={isEditable ? handleAddNode : undefined}
        onEditNode={isEditable ? handleEditNode : undefined}
        onAddEdge={isEditable ? handleAddEdge : undefined}
        onDragEdgeCreate={isEditable ? handleDragEdgeCreate : undefined}
        onDeleteEdge={isEditable ? handleDeleteEdge : undefined}
        onEditEdge={isEditable ? handleEditEdge : undefined}
        onInsertNodeOnEdge={isEditable ? handleInsertNodeOnEdge : undefined}
        onEditStart={isEditable ? handleCanvasEditStart : undefined}
        onEditEnd={isEditable ? handleCanvasEditEnd : undefined}
        {mermaid}
        {mermaidConfig}
        {initializeMermaid}
        {autoFitOnResize}
        strings={helpPanelStrings}
      />
    </div>

    {#if showCode}
      <div class="code-container" class:editing-overlay={isCanvasEditing}>
        <CodePanel
          {code}
          error={parseError}
          onCodeChange={handleCodeChange}
          readOnly={readOnly}
          strings={codePanelStrings}
        />
        <!-- 编辑遮盖层 -->
        {#if isCanvasEditing}
          <div class="code-overlay">
            <div class="overlay-content">
              <div class="overlay-icon">🎨</div>
              <div class="overlay-text">{overlayStrings.editingText}</div>
              <div class="overlay-hint">{overlayStrings.editingHint}</div>
            </div>
          </div>
        {/if}
      </div>
    {/if}
  </div>

  {#if interactionError}
    <div class="interaction-toast" role="status">
      {interactionError}
    </div>
  {/if}
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

<!-- 边编辑对话框 -->
{#if edgeEditDialogState?.visible}
  <EdgeEditDialog
    edgeId={edgeEditDialogState.edgeId}
    sourceId={edgeEditDialogState.sourceId}
    targetId={edgeEditDialogState.targetId}
    initialText={edgeEditDialogState.text}
    initialStroke={edgeEditDialogState.stroke}
    initialArrow={edgeEditDialogState.arrow}
    onConfirm={handleEditEdgeConfirm}
    onCancel={handleEditEdgeCancel}
  />
{/if}

<style>
  .editor {
    position: relative;
    display: flex;
    flex-direction: column;
    width: 100%;
    height: 100%;
    background: var(--merfolk-bg, #f5f5f5);
  }

  /* 图类型提示横幅 */
  .diagram-type-banner {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 10px 16px;
    background: var(--merfolk-banner-bg, linear-gradient(135deg, #667eea 0%, #764ba2 100%));
    color: var(--merfolk-banner-text, #ffffff);
    box-shadow: 0 2px 8px var(--merfolk-banner-shadow, rgba(102, 126, 234, 0.3));
  }

  .banner-icon {
    font-size: 24px;
    flex-shrink: 0;
  }

  .banner-content {
    flex: 1;
    min-width: 0;
  }

  .banner-type {
    font-size: 14px;
    font-weight: 600;
    letter-spacing: 0.5px;
  }

  .banner-desc {
    font-size: 12px;
    opacity: 0.9;
    margin-top: 2px;
  }

  .editor-content {
    display: flex;
    flex: 1;
    overflow: hidden;
  }

  .canvas-container {
    flex: 1;
    min-width: 0;
    background: var(--merfolk-panel, #ffffff);
    border-right: 1px solid var(--merfolk-border, #e0e0e0);
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
    background: var(--merfolk-overlay-bg, rgba(30, 30, 30, 0.85));
    backdrop-filter: blur(4px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10;
  }

  .overlay-content {
    text-align: center;
    color: var(--merfolk-overlay-text, #ffffff);
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
    color: var(--merfolk-overlay-muted, #888888);
  }

  @keyframes pulse {
    0%, 100% { opacity: 1; transform: scale(1); }
    50% { opacity: 0.7; transform: scale(1.05); }
  }

  .interaction-toast {
    position: absolute;
    right: 16px;
    bottom: 16px;
    max-width: 320px;
    padding: 10px 14px;
    border-radius: 8px;
    background: var(--merfolk-toast-bg, rgba(35, 35, 35, 0.92));
    color: var(--merfolk-toast-text, #ffffff);
    font-size: 12px;
    line-height: 1.4;
    box-shadow: 0 6px 18px var(--merfolk-toast-shadow, rgba(0, 0, 0, 0.18));
    z-index: 20;
  }
</style>
