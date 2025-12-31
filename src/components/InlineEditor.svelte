<script lang="ts">
  import { onMount } from 'svelte';

  interface Props {
    value: string;
    x: number;
    y: number;
    minWidth?: number;
    onConfirm: (value: string) => void;
    onCancel: () => void;
  }

  let {
    value = $bindable(),
    x,
    y,
    minWidth = 80,
    onConfirm,
    onCancel,
  }: Props = $props();

  let inputEl: HTMLInputElement;
  let inputWidth = $state(80);

  $effect.pre(() => {
    inputWidth = minWidth;
  });

  onMount(() => {
    if (inputEl) {
      inputEl.focus();
      inputEl.select();
      updateWidth();
    }
  });

  function updateWidth(): void {
    if (!inputEl) return;
    // Create a temporary span to measure text width
    const span = document.createElement('span');
    span.style.visibility = 'hidden';
    span.style.position = 'absolute';
    span.style.whiteSpace = 'pre';
    span.style.font = getComputedStyle(inputEl).font;
    span.textContent = value || 'W';
    document.body.appendChild(span);
    inputWidth = Math.max(minWidth, span.offsetWidth + 20);
    document.body.removeChild(span);
  }

  function handleKeydown(e: KeyboardEvent): void {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onConfirm(value);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onCancel();
    }
  }

  function handleBlur(): void {
    // Small delay to allow click events to register first
    setTimeout(() => {
      onConfirm(value);
    }, 100);
  }

  function handleInput(): void {
    updateWidth();
  }
</script>

<input
  bind:this={inputEl}
  bind:value
  type="text"
  class="inline-editor"
  style="left: {x}px; top: {y}px; width: {inputWidth}px;"
  onkeydown={handleKeydown}
  onblur={handleBlur}
  oninput={handleInput}
  data-testid="inline-editor"
/>

<style>
  .inline-editor {
    position: absolute;
    transform: translate(-50%, -50%);
    padding: 4px 8px;
    border: 2px solid #1976d2;
    border-radius: 4px;
    font-size: 14px;
    font-family: inherit;
    text-align: center;
    background: white;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
    outline: none;
    z-index: 1000;
  }

  .inline-editor:focus {
    border-color: #1565c0;
    box-shadow: 0 0 0 3px rgba(25, 118, 210, 0.2);
  }
</style>
