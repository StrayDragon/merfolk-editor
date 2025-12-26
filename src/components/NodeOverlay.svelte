<script lang="ts">
  /**
   * NodeOverlay - 节点选中时的覆盖层 (draw.io 风格)
   *
   * 简化版:只显示底部连接点(符合流程图从上到下的流向)
   * 使用屏幕坐标,配合 transform 变化更新
   */
  interface NodeBounds {
    x: number;      // 屏幕坐标 X (相对于容器)
    y: number;      // 屏幕坐标 Y (相对于容器)
    width: number;  // 屏幕宽度(已缩放)
    height: number; // 屏幕高度(已缩放)
  }

  interface Props {
    nodeId: string;
    bounds: NodeBounds;
    onEdit?: (nodeId: string) => void;
    onDelete?: (nodeId: string) => void;
    onAddEdge?: (nodeId: string) => void;
  }

  let {
    nodeId,
    bounds,
    onEdit,
    onDelete,
    onAddEdge,
  }: Props = $props();

  // 直接使用 bounds(已经是屏幕坐标)
  const x = $derived(bounds.x);
  const y = $derived(bounds.y);
  const width = $derived(bounds.width);
  const height = $derived(bounds.height);

  // 只有底部一个连接点
  const portX = $derived(x + width / 2);
  const portY = $derived(y + height);

  // 工具栏位置(节点上方)
  const toolbarX = $derived(x + width / 2);
  const toolbarY = $derived(y - 8);
</script>

<!-- 选择框 -->
<div
  class="selection-box"
  style="
    left: {x - 1}px;
    top: {y - 1}px;
    width: {width + 2}px;
    height: {height + 2}px;
  "
></div>

<!-- 底部连接点 (只有一个) -->
<button
  class="port-button"
  style="left: {portX}px; top: {portY}px;"
  onclick={() => onAddEdge?.(nodeId)}
  title="添加下级节点连接"
>
  <svg viewBox="0 0 16 16" width="16" height="16">
    <circle cx="8" cy="8" r="7" fill="white" stroke="#0d6efd" stroke-width="2"/>
    <line x1="8" y1="4" x2="8" y2="12" stroke="#0d6efd" stroke-width="2" stroke-linecap="round"/>
    <line x1="4" y1="8" x2="12" y2="8" stroke="#0d6efd" stroke-width="2" stroke-linecap="round"/>
  </svg>
</button>

<!-- 浮动工具栏(紧凑版) -->
<div
  class="toolbar"
  style="left: {toolbarX}px; top: {toolbarY}px;"
>
  <button onclick={() => onEdit?.(nodeId)} title="编辑 (双击)">
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
    </svg>
  </button>
  <button onclick={() => onDelete?.(nodeId)} title="删除 (Del)" class="danger">
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
      <polyline points="3 6 5 6 21 6"/>
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
    </svg>
  </button>
</div>

<style>
  .selection-box {
    position: absolute;
    border: 2px solid #0d6efd;
    background: transparent;
    pointer-events: none;
    z-index: 10;
    border-radius: 2px;
  }

  .port-button {
    position: absolute;
    transform: translate(-50%, -50%);
    width: 22px;
    height: 22px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: white;
    border: none;
    border-radius: 50%;
    cursor: pointer;
    z-index: 20;
    box-shadow: 0 1px 4px rgba(0,0,0,0.2);
    padding: 0;
    transition: transform 0.1s ease;
  }

  .port-button:hover {
    transform: translate(-50%, -50%) scale(1.15);
    box-shadow: 0 2px 8px rgba(13, 110, 253, 0.4);
  }

  .toolbar {
    position: absolute;
    transform: translate(-50%, -100%);
    display: flex;
    gap: 1px;
    padding: 3px;
    background: #fff;
    border: 1px solid #dee2e6;
    border-radius: 6px;
    box-shadow: 0 2px 8px rgba(0,0,0,0.12);
    z-index: 30;
  }

  .toolbar button {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 26px;
    height: 26px;
    padding: 0;
    border: none;
    border-radius: 4px;
    background: transparent;
    color: #495057;
    cursor: pointer;
  }

  .toolbar button:hover {
    background: #f1f3f4;
  }

  .toolbar button.danger:hover {
    background: #fff5f5;
    color: #dc3545;
  }
</style>
