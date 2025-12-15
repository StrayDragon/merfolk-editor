<script lang="ts">
  import Editor from './components/Editor.svelte';

  // Sample Mermaid code for testing (including bidirectional edges)
  const initialCode = `flowchart TB
    A[Start] --> B{Is it working?}
    B -->|Yes| C[Great!]
    B -->|No| D[Debug]
    D <--> B
    C --> E((End))

    %% Test different bidirectional edge types
    F x--x G
    H <--> I
`;
</script>

<main class="app">
  <Editor {initialCode} />
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
</style>
