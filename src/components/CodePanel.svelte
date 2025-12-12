<script lang="ts">
  interface Props {
    code: string;
    error?: string | null;
    onCodeChange: (code: string) => void;
  }

  let { code, error = null, onCodeChange }: Props = $props();

  let textareaEl: HTMLTextAreaElement;
  let debounceTimer: ReturnType<typeof setTimeout> | null = null;

  function handleInput(event: Event): void {
    const target = event.target as HTMLTextAreaElement;
    const newCode = target.value;

    // Debounce code changes
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }

    debounceTimer = setTimeout(() => {
      onCodeChange(newCode);
    }, 300);
  }

  function handleKeyDown(event: KeyboardEvent): void {
    // Handle Tab key for indentation
    if (event.key === 'Tab') {
      event.preventDefault();
      const start = textareaEl.selectionStart;
      const end = textareaEl.selectionEnd;
      const value = textareaEl.value;

      textareaEl.value =
        value.substring(0, start) + '    ' + value.substring(end);
      textareaEl.selectionStart = textareaEl.selectionEnd = start + 4;

      // Trigger input event
      textareaEl.dispatchEvent(new Event('input'));
    }
  }
</script>

<div class="code-panel">
  <div class="code-header">
    <span class="code-title">Mermaid Code</span>
    {#if error}
      <span class="code-error" title={error}>Error</span>
    {/if}
  </div>

  <div class="code-editor">
    <textarea
      bind:this={textareaEl}
      value={code}
      oninput={handleInput}
      onkeydown={handleKeyDown}
      spellcheck="false"
      placeholder="Enter Mermaid flowchart code..."
    ></textarea>
  </div>

  {#if error}
    <div class="error-message">
      {error}
    </div>
  {/if}
</div>

<style>
  .code-panel {
    display: flex;
    flex-direction: column;
    height: 100%;
    background: #1e1e1e;
  }

  .code-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 12px;
    background: #252526;
    border-bottom: 1px solid #3c3c3c;
  }

  .code-title {
    color: #cccccc;
    font-size: 12px;
    font-weight: 500;
  }

  .code-error {
    color: #f48771;
    font-size: 11px;
    padding: 2px 6px;
    background: rgba(244, 135, 113, 0.1);
    border-radius: 3px;
  }

  .code-editor {
    flex: 1;
    overflow: hidden;
  }

  textarea {
    width: 100%;
    height: 100%;
    padding: 12px;
    border: none;
    outline: none;
    resize: none;
    background: #1e1e1e;
    color: #d4d4d4;
    font-family: 'Fira Code', 'Consolas', 'Monaco', monospace;
    font-size: 13px;
    line-height: 1.5;
    tab-size: 4;
  }

  textarea::placeholder {
    color: #6a6a6a;
  }

  .error-message {
    padding: 8px 12px;
    background: rgba(244, 135, 113, 0.1);
    border-top: 1px solid #f48771;
    color: #f48771;
    font-size: 12px;
    max-height: 80px;
    overflow-y: auto;
  }
</style>
