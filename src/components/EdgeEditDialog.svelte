<script lang="ts">
  import { onMount } from 'svelte';
  import type { StrokeType, ArrowType } from '../core/model/types';

  interface Props {
    /** 边 ID */
    edgeId: string;
    /** 源节点 ID */
    sourceId: string;
    /** 目标节点 ID */
    targetId: string;
    /** 当前边文本 */
    initialText: string;
    /** 当前线条类型 */
    initialStroke?: StrokeType;
    /** 当前箭头类型 */
    initialArrow?: ArrowType;
    /** 确认回调 */
    onConfirm: (edgeId: string, text: string, stroke: StrokeType, arrow: ArrowType) => void;
    /** 取消回调 */
    onCancel: () => void;
  }

  let {
    edgeId,
    sourceId,
    targetId,
    initialText,
    initialStroke = 'normal',
    initialArrow = 'arrow',
    onConfirm,
    onCancel
  }: Props = $props();

  let text = $state('');
  let stroke = $state<StrokeType>('normal');
  let arrow = $state<ArrowType>('arrow');
  let inputEl: HTMLInputElement;

  // 当 props 变化时更新内部状态
  $effect(() => {
    text = initialText;
    stroke = initialStroke;
    arrow = initialArrow;
  });

  // 线条类型选项
  const strokeOptions: { value: StrokeType; label: string; preview: string }[] = [
    { value: 'normal', label: '实线', preview: '───────' },
    { value: 'thick', label: '粗线', preview: '━━━━━━━' },
    { value: 'dotted', label: '虚线', preview: '- - - - -' },
  ];

  // 箭头类型选项
  const arrowOptions: { value: ArrowType; label: string; preview: string }[] = [
    { value: 'arrow', label: '箭头', preview: '→' },
    { value: 'circle', label: '圆形', preview: '○' },
    { value: 'cross', label: '叉形', preview: '×' },
    { value: 'none', label: '无', preview: '—' },
  ];

  onMount(() => {
    inputEl?.focus();
    inputEl?.select();
  });

  function handleKeyDown(e: KeyboardEvent): void {
    if (e.key === 'Escape') {
      onCancel();
    } else if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleConfirm();
    }
  }

  function handleConfirm(): void {
    onConfirm(edgeId, text.trim(), stroke, arrow);
  }

  function handleBackdropClick(e: MouseEvent): void {
    if (e.target === e.currentTarget) {
      onCancel();
    }
  }
</script>

<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<!-- svelte-ignore a11y_click_events_have_key_events -->
<div
  class="dialog-backdrop"
  onclick={handleBackdropClick}
  onkeydown={handleKeyDown}
  role="presentation"
  tabindex="-1"
>
  <div
    class="dialog"
    role="dialog"
    aria-modal="true"
    aria-labelledby="edge-edit-dialog-title"
    tabindex="-1"
  >
    <div class="dialog-header">
      <h3 id="edge-edit-dialog-title">编辑连接</h3>
      <button class="close-btn" onclick={onCancel} aria-label="关闭">✕</button>
    </div>

    <div class="dialog-body">
      <!-- 连接预览 -->
      <div class="edge-preview">
        <span class="node-badge">{sourceId}</span>
        <span class="edge-line">
          {strokeOptions.find(s => s.value === stroke)?.preview}
          {arrowOptions.find(a => a.value === arrow)?.preview}
        </span>
        <span class="node-badge">{targetId}</span>
      </div>

      <div class="form-group">
        <label for="edge-text">连接文本(可选)</label>
        <input
          id="edge-text"
          type="text"
          bind:this={inputEl}
          bind:value={text}
          placeholder="输入连接文本..."
        />
      </div>

      <!-- svelte-ignore a11y_label_has_associated_control -->
      <div class="form-group">
        <label>线条样式</label>
        <div class="option-row" role="group" aria-label="线条样式选择">
          {#each strokeOptions as option}
            <button
              class="style-option"
              class:selected={stroke === option.value}
              onclick={() => stroke = option.value}
              title={option.label}
            >
              <span class="option-preview">{option.preview}</span>
              <span class="option-label">{option.label}</span>
            </button>
          {/each}
        </div>
      </div>

      <!-- svelte-ignore a11y_label_has_associated_control -->
      <div class="form-group">
        <label>箭头样式</label>
        <div class="option-row" role="group" aria-label="箭头样式选择">
          {#each arrowOptions as option}
            <button
              class="style-option"
              class:selected={arrow === option.value}
              onclick={() => arrow = option.value}
              title={option.label}
            >
              <span class="option-preview arrow">{option.preview}</span>
              <span class="option-label">{option.label}</span>
            </button>
          {/each}
        </div>
      </div>
    </div>

    <div class="dialog-footer">
      <button class="btn btn-secondary" onclick={onCancel}>取消</button>
      <button class="btn btn-primary" onclick={handleConfirm}>
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
    background: var(--merfolk-backdrop, rgba(0, 0, 0, 0.4));
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
    background: var(--merfolk-panel, #ffffff);
    border-radius: 12px;
    box-shadow: 0 8px 32px var(--merfolk-shadow, rgba(0, 0, 0, 0.2));
    min-width: 380px;
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
    border-bottom: 1px solid var(--merfolk-border, #e8e8e8);
  }

  .dialog-header h3 {
    margin: 0;
    font-size: 16px;
    font-weight: 600;
    color: var(--merfolk-text, #1a1a1a);
  }

  .close-btn {
    background: none;
    border: none;
    font-size: 16px;
    color: var(--merfolk-text-muted, #666);
    cursor: pointer;
    padding: 4px 8px;
    border-radius: 4px;
    transition: all 0.15s;
  }

  .close-btn:hover {
    background: var(--merfolk-button-hover, #f0f0f0);
    color: var(--merfolk-text, #333);
  }

  .dialog-body {
    padding: 20px;
  }

  /* 连接预览 */
  .edge-preview {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 12px;
    padding: 16px;
    background: var(--merfolk-panel-muted, linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%));
    border-radius: 8px;
    margin-bottom: 20px;
  }

  .node-badge {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 40px;
    padding: 6px 12px;
    background: var(--merfolk-panel, #fff);
    border: 2px solid var(--merfolk-accent, #1976d2);
    border-radius: 6px;
    font-size: 12px;
    font-weight: 600;
    color: var(--merfolk-accent, #1976d2);
    box-shadow: 0 1px 3px var(--merfolk-shadow-soft, rgba(0, 0, 0, 0.1));
  }

  .edge-line {
    font-family: monospace;
    font-size: 14px;
    color: var(--merfolk-text-muted, #666);
    letter-spacing: -1px;
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
    color: var(--merfolk-text, #444);
    margin-bottom: 8px;
  }

  .form-group input[type="text"] {
    width: 100%;
    padding: 10px 12px;
    border: 1px solid var(--merfolk-border, #ddd);
    border-radius: 6px;
    font-size: 14px;
    transition: border-color 0.15s, box-shadow 0.15s;
    box-sizing: border-box;
  }

  .form-group input[type="text"]:focus {
    outline: none;
    border-color: var(--merfolk-accent, #1976d2);
    box-shadow: 0 0 0 3px var(--merfolk-accent-glow-soft, rgba(25, 118, 210, 0.1));
  }

  .option-row {
    display: flex;
    gap: 8px;
  }

  .style-option {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 12px 8px;
    border: 1px solid var(--merfolk-border, #e0e0e0);
    border-radius: 8px;
    background: var(--merfolk-panel-muted, #fafafa);
    cursor: pointer;
    transition: all 0.15s;
    gap: 6px;
  }

  .style-option:hover {
    border-color: var(--merfolk-border-strong, #bbb);
    background: var(--merfolk-button-hover, #f0f0f0);
  }

  .style-option.selected {
    border-color: var(--merfolk-accent, #1976d2);
    background: var(--merfolk-accent-soft, #e3f2fd);
  }

  .option-preview {
    font-family: monospace;
    font-size: 14px;
    color: var(--merfolk-text, #333);
    letter-spacing: -1px;
  }

  .option-preview.arrow {
    font-size: 20px;
    letter-spacing: 0;
  }

  .option-label {
    font-size: 11px;
    color: var(--merfolk-text-muted, #666);
  }

  .style-option.selected .option-label {
    color: var(--merfolk-accent, #1976d2);
    font-weight: 500;
  }

  .dialog-footer {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
    padding: 16px 20px;
    border-top: 1px solid var(--merfolk-border, #e8e8e8);
    background: var(--merfolk-panel-muted, #fafafa);
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

  .btn-secondary {
    background: var(--merfolk-panel, #fff);
    border-color: var(--merfolk-border, #ddd);
    color: var(--merfolk-text-muted, #666);
  }

  .btn-secondary:hover {
    background: var(--merfolk-button-hover, #f5f5f5);
    border-color: var(--merfolk-border-strong, #ccc);
  }

  .btn-primary {
    background: var(--merfolk-accent, #1976d2);
    color: var(--merfolk-accent-contrast, #fff);
  }

  .btn-primary:hover {
    background: var(--merfolk-accent-strong, #1565c0);
  }
</style>
