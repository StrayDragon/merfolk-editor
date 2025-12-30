<script lang="ts">
  import { onDestroy, onMount } from 'svelte';
  import Editor from './components/Editor.svelte';
  import { clearMermaidDraft, loadMermaidDraft, saveMermaidDraft } from '$lib/storage/mermaidDraft';

  // Sample Mermaid code for testing (including subgraphs)
  const fallbackCode = `flowchart TB
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
`;

  let initialCode = $state(fallbackCode);
  let isReady = $state(false);
  let saveTimer: ReturnType<typeof setTimeout> | null = null;
  let lastSaved: string | null = null;
  let editorKey = $state(0);

  onMount(async () => {
    try {
      const saved = await loadMermaidDraft();
      if (saved !== null) {
        initialCode = saved;
      }
    } catch (error) {
      console.warn('[App] Failed to load saved Mermaid code:', error);
    } finally {
      lastSaved = initialCode;
      isReady = true;
    }
  });

  onDestroy(() => {
    if (saveTimer) {
      clearTimeout(saveTimer);
    }
  });

  function handleCodeChange(newCode: string): void {
    if (saveTimer) {
      clearTimeout(saveTimer);
    }

    saveTimer = setTimeout(async () => {
      if (newCode === lastSaved) return;

      try {
        await saveMermaidDraft(newCode);
        lastSaved = newCode;
      } catch (error) {
        console.warn('[App] Failed to save Mermaid code:', error);
      }
    }, 500);
  }

  async function handleClearDraft(): Promise<void> {
    if (saveTimer) {
      clearTimeout(saveTimer);
      saveTimer = null;
    }

    try {
      await clearMermaidDraft();
    } catch (error) {
      console.warn('[App] Failed to clear Mermaid draft:', error);
    }

    initialCode = fallbackCode;
    lastSaved = fallbackCode;
    editorKey += 1;
  }
</script>

<main class="app">
  {#if isReady}
    {#key editorKey}
      <Editor {initialCode} onCodeChange={handleCodeChange} onClearDraft={handleClearDraft} />
    {/key}
  {:else}
    <div class="loading">Loading draft...</div>
  {/if}
</main>

<style>
  :global(body) {
    margin: 0;
    padding: 0;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen,
      Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
  }

  .app {
    width: 100vw;
    height: 100vh;
    display: flex;
    flex-direction: column;
  }

  .loading {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #666;
    font-size: 14px;
  }
</style>
