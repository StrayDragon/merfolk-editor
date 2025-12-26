<script lang="ts">
  import { onMount } from 'svelte';
  import type { StrokeType, ArrowType } from '$core/model/types';

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
<div class="dialog-backdrop" onclick={handleBackdropClick} role="dialog" aria-modal="true">
  <div class="dialog">
    <div class="dialog-header">
      <h3>编辑连接</h3>
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

  /* 连接预览 */
  .edge-preview {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 12px;
    padding: 16px;
    background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
    border-radius: 8px;
    margin-bottom: 20px;
  }

  .node-badge {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 40px;
    padding: 6px 12px;
    background: #fff;
    border: 2px solid #1976d2;
    border-radius: 6px;
    font-size: 12px;
    font-weight: 600;
    color: #1976d2;
    box-shadow: 0 1px 3px rgba(0,0,0,0.1);
  }

  .edge-line {
    font-family: monospace;
    font-size: 14px;
    color: #666;
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
    border-color: #1976d2;
    box-shadow: 0 0 0 3px rgba(25, 118, 210, 0.1);
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
    border: 1px solid #e0e0e0;
    border-radius: 8px;
    background: #fafafa;
    cursor: pointer;
    transition: all 0.15s;
    gap: 6px;
  }

  .style-option:hover {
    border-color: #bbb;
    background: #f0f0f0;
  }

  .style-option.selected {
    border-color: #1976d2;
    background: #e3f2fd;
  }

  .option-preview {
    font-family: monospace;
    font-size: 14px;
    color: #333;
    letter-spacing: -1px;
  }

  .option-preview.arrow {
    font-size: 20px;
    letter-spacing: 0;
  }

  .option-label {
    font-size: 11px;
    color: #666;
  }

  .style-option.selected .option-label {
    color: #1976d2;
    font-weight: 500;
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

  .btn-secondary {
    background: #fff;
    border-color: #ddd;
    color: #666;
  }

  .btn-secondary:hover {
    background: #f5f5f5;
    border-color: #ccc;
  }

  .btn-primary {
    background: #1976d2;
    color: #fff;
  }

  .btn-primary:hover {
    background: #1565c0;
  }
</style>

