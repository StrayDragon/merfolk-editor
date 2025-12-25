<script lang="ts">
  import type { ShapeType } from '$core/model/types';

  interface ShapeItem {
    type: ShapeType;
    label: string;
    icon: string;
    category: 'basic' | 'container' | 'process' | 'special';
  }

  interface Props {
    onSelectShape: (shape: ShapeType) => void;
    selectedShape?: ShapeType;
  }

  let { onSelectShape, selectedShape }: Props = $props();

  const shapes: ShapeItem[] = [
    // Basic shapes
    { type: 'rect', label: '矩形', icon: '□', category: 'basic' },
    { type: 'rounded', label: '圆角矩形', icon: '▢', category: 'basic' },
    { type: 'stadium', label: '胶囊形', icon: '⬭', category: 'basic' },
    { type: 'circle', label: '圆形', icon: '○', category: 'basic' },
    { type: 'doublecircle', label: '双圆形', icon: '◎', category: 'basic' },

    // Decision/logic shapes
    { type: 'diamond', label: '菱形', icon: '◇', category: 'process' },
    { type: 'hexagon', label: '六边形', icon: '⬡', category: 'process' },
    { type: 'triangle', label: '三角形', icon: '△', category: 'process' },
    { type: 'hourglass', label: '沙漏', icon: '⧗', category: 'process' },

    // Container shapes
    { type: 'subroutine', label: '子程序', icon: '▤', category: 'container' },
    { type: 'cylinder', label: '数据库', icon: '⌗', category: 'container' },
    { type: 'doc', label: '文档', icon: '📄', category: 'container' },
    { type: 'notch-rect', label: '卡片', icon: '⎘', category: 'container' },

    // Special shapes
    { type: 'odd', label: '旗帜', icon: '▷', category: 'special' },
    { type: 'bolt', label: '闪电', icon: '⚡', category: 'special' },
    { type: 'delay', label: '延迟', icon: '⏳', category: 'special' },
    { type: 'fork', label: '分叉/合并', icon: '═', category: 'special' },
  ];

  const categories = [
    { id: 'basic', label: '基础形状' },
    { id: 'process', label: '流程形状' },
    { id: 'container', label: '容器形状' },
    { id: 'special', label: '特殊形状' },
  ];

  function handleShapeClick(shape: ShapeType): void {
    onSelectShape(shape);
  }

  function handleDragStart(e: DragEvent, shape: ShapeType): void {
    if (e.dataTransfer) {
      e.dataTransfer.setData('application/merfolk-shape', shape);
      e.dataTransfer.effectAllowed = 'copy';
    }
  }
</script>

<div class="shape-panel">
  <h3 class="panel-title">形状</h3>

  {#each categories as category}
    {@const categoryShapes = shapes.filter((s) => s.category === category.id)}
    {#if categoryShapes.length > 0}
      <div class="category">
        <div class="category-label">{category.label}</div>
        <div class="shape-grid">
          {#each categoryShapes as shape}
            <button
              class="shape-item"
              class:selected={selectedShape === shape.type}
              title={shape.label}
              onclick={() => handleShapeClick(shape.type)}
              draggable="true"
              ondragstart={(e) => handleDragStart(e, shape.type)}
            >
              <span class="shape-icon">{shape.icon}</span>
              <span class="shape-label">{shape.label}</span>
            </button>
          {/each}
        </div>
      </div>
    {/if}
  {/each}
</div>

<style>
  .shape-panel {
    width: 200px;
    background: #fff;
    border-right: 1px solid #e0e0e0;
    padding: 12px;
    overflow-y: auto;
    font-size: 13px;
  }

  .panel-title {
    margin: 0 0 12px 0;
    font-size: 14px;
    font-weight: 600;
    color: #333;
  }

  .category {
    margin-bottom: 16px;
  }

  .category-label {
    font-size: 11px;
    font-weight: 500;
    color: #666;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin-bottom: 8px;
  }

  .shape-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 6px;
  }

  .shape-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 8px 4px;
    background: #f8f8f8;
    border: 1px solid #e0e0e0;
    border-radius: 6px;
    cursor: grab;
    transition: all 0.15s ease;
    user-select: none;
  }

  .shape-item:hover {
    background: #eef5ff;
    border-color: #1976d2;
  }

  .shape-item.selected {
    background: #e3f2fd;
    border-color: #1976d2;
    box-shadow: 0 0 0 2px rgba(25, 118, 210, 0.2);
  }

  .shape-item:active {
    cursor: grabbing;
    transform: scale(0.95);
  }

  .shape-icon {
    font-size: 20px;
    line-height: 1;
    margin-bottom: 4px;
  }

  .shape-label {
    font-size: 10px;
    color: #666;
    text-align: center;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 100%;
  }

  .shape-item.selected .shape-label {
    color: #1565c0;
    font-weight: 500;
  }
</style>

