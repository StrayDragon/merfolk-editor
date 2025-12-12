<script lang="ts">
  import DebugCompare from './components/DebugCompare.svelte';
  import CodePanel from './components/CodePanel.svelte';

  // Sample Mermaid code for testing
  let code = $state(`flowchart TB
    A[Start] --> B{Is it working?}
    B -->|Yes| C[Great!]
    B -->|No| D[Debug]
    D --> B
    C --> E((End))
`);

  let parseError = $state<string | null>(null);

  function handleCodeChange(newCode: string): void {
    code = newCode;
    parseError = null;
  }
</script>

<main class="debug-app">
  <header class="header">
    <h1>Merfolk Editor - Debug Mode</h1>
    <span class="subtitle">Compare Mermaid native rendering vs Custom renderer</span>
  </header>

  <div class="content">
    <div class="compare-section">
      <DebugCompare {code} />
    </div>

    <div class="code-section">
      <CodePanel
        {code}
        error={parseError}
        onCodeChange={handleCodeChange}
      />
    </div>
  </div>
</main>

<style>
  :global(body) {
    margin: 0;
    padding: 0;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen,
      Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
  }

  .debug-app {
    width: 100vw;
    height: 100vh;
    display: flex;
    flex-direction: column;
    background: #1e1e1e;
  }

  .header {
    padding: 12px 20px;
    background: #252526;
    border-bottom: 1px solid #3c3c3c;
    display: flex;
    align-items: baseline;
    gap: 16px;
  }

  .header h1 {
    margin: 0;
    font-size: 18px;
    font-weight: 600;
    color: #fff;
  }

  .subtitle {
    font-size: 13px;
    color: #888;
  }

  .content {
    flex: 1;
    display: flex;
    overflow: hidden;
  }

  .compare-section {
    flex: 1;
    min-width: 0;
  }

  .code-section {
    width: 400px;
    min-width: 300px;
    border-left: 1px solid #3c3c3c;
  }
</style>
