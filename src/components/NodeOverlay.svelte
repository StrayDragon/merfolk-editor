<script lang="ts">
  /**
   * NodeOverlay - 节点选中时的覆盖层
   * 包含：选择框、连接点(ports)、浮动工具栏
   *
   * 注意：bounds 传入的已经是屏幕坐标，不需要再进行转换
   */
  interface NodeBounds {
    x: number;      // 屏幕坐标 X
    y: number;      // 屏幕坐标 Y
    width: number;  // 屏幕宽度（已缩放）
    height: number; // 屏幕高度（已缩放）
  }

  interface Props {
    nodeId: string;
    bounds: NodeBounds; // 已经是屏幕坐标
    onEdit?: (nodeId: string) => void;
    onDelete?: (nodeId: string) => void;
    onAddEdge?: (nodeId: string, direction: 'top' | 'right' | 'bottom' | 'left') => void;
    onDuplicate?: (nodeId: string) => void;
  }

  let {
    nodeId,
    bounds,
    onEdit,
    onDelete,
    onAddEdge,
    onDuplicate,
  }: Props = $props();

  // bounds 已经是屏幕坐标，直接使用
  const screenX = $derived(bounds.x);
  const screenY = $derived(bounds.y);
  const screenWidth = $derived(bounds.width);
  const screenHeight = $derived(bounds.height);

  // Port 位置（中心点）
  const ports = $derived([
    { id: 'top', x: screenX + screenWidth / 2, y: screenY, direction: 'top' as const },
    { id: 'right', x: screenX + screenWidth, y: screenY + screenHeight / 2, direction: 'right' as const },
    { id: 'bottom', x: screenX + screenWidth / 2, y: screenY + screenHeight, direction: 'bottom' as const },
    { id: 'left', x: screenX, y: screenY + screenHeight / 2, direction: 'left' as const },
  ]);

  function handlePortClick(direction: 'top' | 'right' | 'bottom' | 'left') {
    onAddEdge?.(nodeId, direction);
  }
</script>

<!-- 选择框 -->
<div
  class="node-selection-box"
  style="
    left: {screenX - 2}px;
    top: {screenY - 2}px;
    width: {screenWidth + 4}px;
    height: {screenHeight + 4}px;
  "
>
  <!-- 四个角的调整手柄（仅视觉，不可拖拽） -->
  <div class="resize-handle nw"></div>
  <div class="resize-handle ne"></div>
  <div class="resize-handle sw"></div>
  <div class="resize-handle se"></div>
</div>

<!-- 连接点 (Ports) -->
{#each ports as port}
  <button
    class="connection-port"
    style="left: {port.x}px; top: {port.y}px;"
    onclick={() => handlePortClick(port.direction)}
    title="添加连接"
  >
    <svg viewBox="0 0 12 12" width="12" height="12">
      <circle cx="6" cy="6" r="5" fill="white" stroke="#1976d2" stroke-width="2"/>
      <line x1="6" y1="3" x2="6" y2="9" stroke="#1976d2" stroke-width="1.5"/>
      <line x1="3" y1="6" x2="9" y2="6" stroke="#1976d2" stroke-width="1.5"/>
    </svg>
  </button>
{/each}

<!-- 浮动工具栏 -->
<div
  class="floating-toolbar"
  style="
    left: {screenX + screenWidth / 2}px;
    top: {screenY - 40}px;
  "
>
  <button class="toolbar-btn" onclick={() => onEdit?.(nodeId)} title="编辑">
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
    </svg>
  </button>

  <button class="toolbar-btn" onclick={() => onDuplicate?.(nodeId)} title="复制">
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
    </svg>
  </button>

  <div class="toolbar-divider"></div>

  <button class="toolbar-btn danger" onclick={() => onDelete?.(nodeId)} title="删除">
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
      <polyline points="3 6 5 6 21 6"/>
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
    </svg>
  </button>
</div>

<style>
  /* 选择框 */
  .node-selection-box {
    position: absolute;
    border: 2px solid #1976d2;
    background: transparent;
    pointer-events: none;
    z-index: 10;
  }

  /* 调整手柄 */
  .resize-handle {
    position: absolute;
    width: 8px;
    height: 8px;
    background: white;
    border: 2px solid #1976d2;
    border-radius: 1px;
  }

  .resize-handle.nw { top: -4px; left: -4px; }
  .resize-handle.ne { top: -4px; right: -4px; }
  .resize-handle.sw { bottom: -4px; left: -4px; }
  .resize-handle.se { bottom: -4px; right: -4px; }

  /* 连接点 */
  .connection-port {
    position: absolute;
    transform: translate(-50%, -50%);
    width: 20px;
    height: 20px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: white;
    border: none;
    border-radius: 50%;
    cursor: pointer;
    z-index: 20;
    box-shadow: 0 1px 3px rgba(0,0,0,0.2);
    transition: transform 0.15s ease, box-shadow 0.15s ease;
    padding: 0;
  }

  .connection-port:hover {
    transform: translate(-50%, -50%) scale(1.2);
    box-shadow: 0 2px 6px rgba(25, 118, 210, 0.4);
  }

  /* 浮动工具栏 */
  .floating-toolbar {
    position: absolute;
    transform: translateX(-50%);
    display: flex;
    align-items: center;
    gap: 2px;
    padding: 4px;
    background: white;
    border: 1px solid #e0e0e0;
    border-radius: 6px;
    box-shadow: 0 2px 8px rgba(0,0,0,0.15);
    z-index: 30;
  }

  .floating-toolbar .toolbar-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    padding: 0;
    border: none;
    border-radius: 4px;
    background: transparent;
    color: #555;
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .floating-toolbar .toolbar-btn:hover {
    background: #f0f0f0;
    color: #333;
  }

  .floating-toolbar .toolbar-btn.danger:hover {
    background: #ffebee;
    color: #d32f2f;
  }

  .toolbar-divider {
    width: 1px;
    height: 20px;
    background: #e0e0e0;
    margin: 0 4px;
  }
</style>

