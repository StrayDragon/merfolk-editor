<script lang="ts">
  import { onMount } from 'svelte';
  import type { ShapeType } from '$core/model/types';

  interface Props {
    /** 节点 ID */
    nodeId: string;
    /** 当前节点文本 */
    initialText: string;
    /** 当前节点形状 */
    initialShape: ShapeType;
    /** 对话框位置 X */
    x?: number;
    /** 对话框位置 Y */
    y?: number;
    /** 确认回调 */
    onConfirm: (nodeId: string, text: string, shape: ShapeType) => void;
    /** 取消回调 */
    onCancel: () => void;
  }

  let {
    nodeId,
    initialText,
    initialShape,
    x,
    y,
    onConfirm,
    onCancel
  }: Props = $props();

  let text = $state('');
  let shape = $state<ShapeType>('rect');
  let dialogEl: HTMLDivElement;
  let inputEl: HTMLInputElement;

  // 当 props 变化时更新内部状态
  $effect(() => {
    text = initialText;
    shape = initialShape;
  });

  // 节点形状选项
  const shapeOptions: { value: ShapeType; label: string; icon: string }[] = [
    { value: 'rect', label: '矩形', icon: '▭' },
    { value: 'rounded', label: '圆角矩形', icon: '▢' },
    { value: 'stadium', label: '胶囊形', icon: '⬭' },
    { value: 'circle', label: '圆形', icon: '○' },
    { value: 'diamond', label: '菱形', icon: '◇' },
    { value: 'hexagon', label: '六边形', icon: '⬡' },
    { value: 'cylinder', label: '圆柱体', icon: '⌸' },
    { value: 'subroutine', label: '子程序', icon: '⧈' },
    { value: 'trapezoid', label: '梯形', icon: '⏢' },
    { value: 'lean_right', label: '平行四边形', icon: '▱' },
  ];

  onMount(() => {
    // 自动聚焦到输入框
    inputEl?.focus();
    inputEl?.select();

    // 调整对话框位置确保不超出视口
    if (dialogEl) {
      const rect = dialogEl.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      if (x !== undefined && x + rect.width > viewportWidth) {
        dialogEl.style.left = `${viewportWidth - rect.width - 16}px`;
      }
      if (y !== undefined && y + rect.height > viewportHeight) {
        dialogEl.style.top = `${viewportHeight - rect.height - 16}px`;
      }
    }

    // ESC 键关闭
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCancel();
      } else if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleConfirm();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  });

  function handleConfirm(): void {
    if (text.trim()) {
      onConfirm(nodeId, text.trim(), shape);
    }
  }

  function handleBackdropClick(e: MouseEvent): void {
    if (e.target === e.currentTarget) {
      onCancel();
    }
  }
</script>

<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_interactive_supports_focus -->
<div class="dialog-backdrop" onclick={handleBackdropClick} role="dialog" aria-modal="true">
  <div
    class="dialog"
    bind:this={dialogEl}
    style={x !== undefined && y !== undefined ? `left: ${x}px; top: ${y}px;` : ''}
  >
    <div class="dialog-header">
      <h3>编辑节点</h3>
      <button class="close-btn" onclick={onCancel} aria-label="关闭">✕</button>
    </div>

    <div class="dialog-body">
      <div class="form-group">
        <label for="node-text">节点文本</label>
        <input
          id="node-text"
          type="text"
          bind:this={inputEl}
          bind:value={text}
          placeholder="输入节点文本..."
        />
      </div>

      <!-- svelte-ignore a11y_label_has_associated_control -->
      <div class="form-group">
        <label>节点形状</label>
        <div class="shape-grid" role="group" aria-label="节点形状选择">
          {#each shapeOptions as option}
            <button
              class="shape-option"
              class:selected={shape === option.value}
              onclick={() => shape = option.value}
              title={option.label}
            >
              <span class="shape-icon">{option.icon}</span>
              <span class="shape-label">{option.label}</span>
            </button>
          {/each}
        </div>
      </div>
    </div>

    <div class="dialog-footer">
      <button class="btn btn-secondary" onclick={onCancel}>取消</button>
      <button class="btn btn-primary" onclick={handleConfirm} disabled={!text.trim()}>
        确认
      </button>
    </div>
  </div>
</div>

<style>
  .dialog-backdrop {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.4);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 2000;
    animation: fadeIn 0.15s ease;
  }

  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  .dialog {
    background: #ffffff;
    border-radius: 12px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
    min-width: 360px;
    max-width: 480px;
    animation: slideUp 0.2s ease;
  }

  @keyframes slideUp {
    from {
      opacity: 0;
      transform: translateY(8px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .dialog-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px 20px;
    border-bottom: 1px solid #e8e8e8;
  }

  .dialog-header h3 {
    margin: 0;
    font-size: 16px;
    font-weight: 600;
    color: #1a1a1a;
  }

  .close-btn {
    background: none;
    border: none;
    font-size: 16px;
    color: #666;
    cursor: pointer;
    padding: 4px 8px;
    border-radius: 4px;
    transition: all 0.15s;
  }

  .close-btn:hover {
    background: #f0f0f0;
    color: #333;
  }

  .dialog-body {
    padding: 20px;
  }

  .form-group {
    margin-bottom: 16px;
  }

  .form-group:last-child {
    margin-bottom: 0;
  }

  .form-group label {
    display: block;
    font-size: 13px;
    font-weight: 500;
    color: #444;
    margin-bottom: 8px;
  }

  .form-group input[type="text"] {
    width: 100%;
    padding: 10px 12px;
    border: 1px solid #ddd;
    border-radius: 6px;
    font-size: 14px;
    transition: border-color 0.15s, box-shadow 0.15s;
    box-sizing: border-box;
  }

  .form-group input[type="text"]:focus {
    outline: none;
    border-color: #2196f3;
    box-shadow: 0 0 0 3px rgba(33, 150, 243, 0.1);
  }

  .shape-grid {
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    gap: 8px;
  }

  .shape-option {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 10px 4px;
    border: 1px solid #e0e0e0;
    border-radius: 6px;
    background: #fafafa;
    cursor: pointer;
    transition: all 0.15s;
    gap: 4px;
  }

  .shape-option:hover {
    border-color: #bbb;
    background: #f0f0f0;
  }

  .shape-option.selected {
    border-color: #2196f3;
    background: #e3f2fd;
    color: #1976d2;
  }

  .shape-icon {
    font-size: 20px;
    line-height: 1;
  }

  .shape-label {
    font-size: 10px;
    color: #666;
    text-align: center;
    line-height: 1.2;
  }

  .shape-option.selected .shape-label {
    color: #1976d2;
  }

  .dialog-footer {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
    padding: 16px 20px;
    border-top: 1px solid #e8e8e8;
    background: #fafafa;
    border-radius: 0 0 12px 12px;
  }

  .btn {
    padding: 8px 16px;
    border-radius: 6px;
    font-size: 13px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.15s;
    border: 1px solid transparent;
  }

  .btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .btn-secondary {
    background: #fff;
    border-color: #ddd;
    color: #666;
  }

  .btn-secondary:hover:not(:disabled) {
    background: #f5f5f5;
    border-color: #ccc;
  }

  .btn-primary {
    background: #2196f3;
    color: #fff;
  }

  .btn-primary:hover:not(:disabled) {
    background: #1976d2;
  }
</style>

