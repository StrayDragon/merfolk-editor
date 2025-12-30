<script lang="ts">
  import DebugCompare from './components/DebugCompare.svelte';
  import CodePanel from './components/CodePanel.svelte';

  // Sample Mermaid code for testing
  let code = $state(`flowchart TB
    subgraph Users["👤 用户(需求方)"]
        User["提出需求"]
    end

    subgraph Channels["📡 通道层"]
        direction LR
        Feishu["飞书 Channel"]
        Future["其他 Channel<br/>(计划中)"]
    end

    subgraph Coordinator["🧠 智能协调层 (核心主线)"]
        direction TB
        Parser["RequirementParser<br/>需求解析"]
        Evaluator["RequirementEvaluator<br/>需求评估"]
        Clarifier["ClarificationFlow<br/>澄清流程"]
        Dispatcher["TaskDispatcher<br/>任务分派"]
        Reporter["ResultReporter<br/>结果汇报"]
        Personality["PersonalityEngine<br/>性格引擎"]
    end

    subgraph LLM["🔮 LLM 提供层"]
        direction LR
        Ollama["Ollama<br/>(本地优先)"]
        Claude["Claude API"]
        OpenAI["OpenAI API"]
    end

    subgraph Adapters["🤖 Agent 执行层"]
        direction LR
        ClaudeCode["Claude Code"]
        Codex["Codex"]
        GeminiCLI["Gemini CLI"]
    end

    subgraph Core["📦 zirvox-core"]
        direction TB
        IChannel["IChannel Protocol"]
        IAdapter["IAdapter Protocol"]
        IProcessor["IProcessor Protocol"]
        Models["数据模型"]
    end

    subgraph Storage["💾 存储层"]
        direction LR
        SQLite["SQLite<br/>开发/轻量部署"]
        PG["PostgreSQL<br/>生产部署"]
    end

    Users --> Channels
    Channels --> Coordinator
    Coordinator --> LLM
    Coordinator --> Adapters
    Coordinator --> Core
    Adapters --> Core
    Core --> Storage
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
