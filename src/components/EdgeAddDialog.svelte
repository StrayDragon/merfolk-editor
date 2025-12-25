<script lang="ts">
  import { onMount } from 'svelte';
  import type { StrokeType, ArrowType } from '$core/model/types';

  interface NodeOption {
    id: string;
    text: string;
  }

  interface Props {
    /** 源节点 ID（已选中的节点） */
    sourceNodeId: string;
    /** 所有可选节点 */
    nodes: NodeOption[];
    /** 确认回调 - targetId 为 '__new__' 表示创建新节点 */
    onConfirm: (sourceId: string, targetId: string, text: string, stroke: StrokeType, arrowType: ArrowType) => void;
    /** 取消回调 */
    onCancel: () => void;
  }

  // 特殊 ID 表示创建新节点
  const NEW_NODE_ID = '__new__';

  let { sourceNodeId, nodes, onConfirm, onCancel }: Props = $props();

  let targetNodeId = $state('');
  let edgeText = $state('');
  let strokeType = $state<StrokeType>('normal');
  let arrowType = $state<ArrowType>('arrow');
  let inputEl: HTMLSelectElement;

  // 可用的目标节点（排除源节点）
  const targetNodes = $derived(nodes.filter(n => n.id !== sourceNodeId));

  // 源节点信息
  const sourceNode = $derived(nodes.find(n => n.id === sourceNodeId));

  // 边线类型选项
  const strokeOptions: { value: StrokeType; label: string; preview: string }[] = [
    { value: 'normal', label: '实线', preview: '───' },
    { value: 'thick', label: '粗线', preview: '━━━' },
    { value: 'dotted', label: '虚线', preview: '- - -' },
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

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCancel();
      } else if (e.key === 'Enter' && !e.shiftKey && targetNodeId) {
        e.preventDefault();
        handleConfirm();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  });

  function handleConfirm(): void {
    if (targetNodeId) {
      onConfirm(sourceNodeId, targetNodeId, edgeText, strokeType, arrowType);
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
  <div class="dialog">
    <div class="dialog-header">
      <h3>添加连接</h3>
      <button class="close-btn" onclick={onCancel} aria-label="关闭">✕</button>
    </div>

    <div class="dialog-body">
      <!-- 连接预览 -->
      <div class="connection-preview">
        <div class="node-preview source">
          <span class="node-icon">◉</span>
          <span class="node-name">{sourceNode?.text || sourceNodeId}</span>
        </div>
        <div class="arrow-preview">
          <span class="line">{strokeOptions.find(s => s.value === strokeType)?.preview}</span>
          <span class="arrow">{arrowOptions.find(a => a.value === arrowType)?.preview}</span>
        </div>
        <div class="node-preview target" class:empty={!targetNodeId} class:new-node={targetNodeId === NEW_NODE_ID}>
          <span class="node-icon">{targetNodeId === NEW_NODE_ID ? '✨' : '◎'}</span>
          <span class="node-name">
            {#if !targetNodeId}
              选择目标节点
            {:else if targetNodeId === NEW_NODE_ID}
              新节点
            {:else}
              {targetNodes.find(n => n.id === targetNodeId)?.text || targetNodeId}
            {/if}
          </span>
        </div>
      </div>

      <div class="form-group">
        <label for="target-node">目标节点</label>
        <select
          id="target-node"
          bind:this={inputEl}
          bind:value={targetNodeId}
        >
          <option value="">-- 选择目标节点 --</option>
          <option value={NEW_NODE_ID} class="new-node-option">✨ 新节点（自动创建）</option>
          <option disabled>────────────</option>
          {#each targetNodes as node}
            <option value={node.id}>{node.text} ({node.id})</option>
          {/each}
        </select>
      </div>

      <div class="form-group">
        <label for="edge-text">连接文本（可选）</label>
        <input
          id="edge-text"
          type="text"
          bind:value={edgeText}
          placeholder="输入连接标签..."
        />
      </div>

      <div class="form-row">
        <!-- svelte-ignore a11y_label_has_associated_control -->
        <div class="form-group half">
          <label>线条类型</label>
          <div class="option-group" role="group" aria-label="线条类型选择">
            {#each strokeOptions as option}
              <button
                class="option-btn"
                class:selected={strokeType === option.value}
                onclick={() => strokeType = option.value}
                title={option.label}
              >
                <span class="option-preview">{option.preview}</span>
                <span class="option-label">{option.label}</span>
              </button>
            {/each}
          </div>
        </div>

        <!-- svelte-ignore a11y_label_has_associated_control -->
        <div class="form-group half">
          <label>箭头类型</label>
          <div class="option-group" role="group" aria-label="箭头类型选择">
            {#each arrowOptions as option}
              <button
                class="option-btn"
                class:selected={arrowType === option.value}
                onclick={() => arrowType = option.value}
                title={option.label}
              >
                <span class="option-preview">{option.preview}</span>
                <span class="option-label">{option.label}</span>
              </button>
            {/each}
          </div>
        </div>
      </div>
    </div>

    <div class="dialog-footer">
      <button class="btn btn-secondary" onclick={onCancel}>取消</button>
      <button class="btn btn-primary" onclick={handleConfirm} disabled={!targetNodeId}>
        添加连接
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
    min-width: 420px;
    max-width: 520px;
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
  .connection-preview {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 12px;
    padding: 16px;
    background: #f8f9fa;
    border-radius: 8px;
    margin-bottom: 20px;
  }

  .node-preview {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 8px 12px;
    background: #e3f2fd;
    border: 1px solid #90caf9;
    border-radius: 6px;
    font-size: 13px;
    color: #1565c0;
  }

  .node-preview.target {
    background: #fff3e0;
    border-color: #ffb74d;
    color: #e65100;
  }

  .node-preview.target.empty {
    background: #f5f5f5;
    border-color: #e0e0e0;
    border-style: dashed;
    color: #999;
  }

  .node-preview.target.new-node {
    background: #e8f5e9;
    border-color: #81c784;
    color: #2e7d32;
  }

  .node-icon {
    font-size: 14px;
  }

  .node-name {
    max-width: 100px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .arrow-preview {
    display: flex;
    align-items: center;
    gap: 2px;
    font-size: 16px;
    color: #666;
    font-family: monospace;
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

  .form-group select,
  .form-group input[type="text"] {
    width: 100%;
    padding: 10px 12px;
    border: 1px solid #ddd;
    border-radius: 6px;
    font-size: 14px;
    transition: border-color 0.15s, box-shadow 0.15s;
    box-sizing: border-box;
    background: #fff;
  }

  .form-group select:focus,
  .form-group input[type="text"]:focus {
    outline: none;
    border-color: #2196f3;
    box-shadow: 0 0 0 3px rgba(33, 150, 243, 0.1);
  }

  .form-row {
    display: flex;
    gap: 16px;
  }

  .form-group.half {
    flex: 1;
  }

  .option-group {
    display: flex;
    gap: 6px;
    flex-wrap: wrap;
  }

  .option-btn {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 8px 10px;
    border: 1px solid #e0e0e0;
    border-radius: 6px;
    background: #fafafa;
    cursor: pointer;
    transition: all 0.15s;
    gap: 4px;
    min-width: 48px;
  }

  .option-btn:hover {
    border-color: #bbb;
    background: #f0f0f0;
  }

  .option-btn.selected {
    border-color: #2196f3;
    background: #e3f2fd;
    color: #1976d2;
  }

  .option-preview {
    font-size: 14px;
    font-family: monospace;
  }

  .option-label {
    font-size: 10px;
    color: #666;
  }

  .option-btn.selected .option-label {
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

