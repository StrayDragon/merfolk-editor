<script lang="ts">
  import { onMount } from 'svelte';
  import mermaid from 'mermaid';

  interface Props {
    code: string;
    onError?: (error: string) => void;
    onRenderComplete?: () => void;
  }

  let { code, onError, onRenderComplete }: Props = $props();

  let containerEl: HTMLDivElement;
  let renderCounter = 0;

  // Initialize mermaid
  onMount(() => {
    mermaid.initialize({
      startOnLoad: false,
      theme: 'default',
      flowchart: {
        useMaxWidth: true,
        htmlLabels: true,
        curve: 'basis',
      },
      securityLevel: 'loose', // Allow click handlers
    });
  });

  // Re-render when code changes
  $effect(() => {
    if (code && containerEl) {
      renderDiagram(code);
    }
  });

  async function renderDiagram(mermaidCode: string): Promise<void> {
    if (!containerEl) return;

    const id = `mermaid-${++renderCounter}`;

    try {
      // Validate syntax first
      await mermaid.parse(mermaidCode);

      // Render the diagram
      const { svg } = await mermaid.render(id, mermaidCode);

      // Insert the SVG
      containerEl.innerHTML = svg;

      // Setup zoom/pan
      setupZoomPan();

      onRenderComplete?.();
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : 'Render error';
      onError?.(errorMsg);

      // Show error in container
      containerEl.innerHTML = `
        <div class="render-error">
          <div class="error-title">Render Error</div>
          <pre class="error-message">${escapeHtml(errorMsg)}</pre>
        </div>
      `;
    }
  }

  function escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  // Simple zoom/pan using CSS transform
  let scale = 1;
  let translateX = 0;
  let translateY = 0;
  let isDragging = false;
  let lastX = 0;
  let lastY = 0;

  function setupZoomPan(): void {
    const svg = containerEl.querySelector('svg');
    if (!svg) return;

    // Reset transform
    scale = 1;
    translateX = 0;
    translateY = 0;
    updateTransform(svg as SVGSVGElement);
  }

  function updateTransform(svg: SVGSVGElement): void {
    svg.style.transform = `translate(${translateX}px, ${translateY}px) scale(${scale})`;
    svg.style.transformOrigin = 'center center';
  }

  function handleWheel(event: WheelEvent): void {
    event.preventDefault();
    const svg = containerEl?.querySelector('svg') as SVGSVGElement;
    if (!svg) return;

    const delta = event.deltaY > 0 ? 0.9 : 1.1;
    scale = Math.max(0.1, Math.min(4, scale * delta));
    updateTransform(svg);
  }

  function handleMouseDown(event: MouseEvent): void {
    if (event.button !== 0) return; // Only left click
    isDragging = true;
    lastX = event.clientX;
    lastY = event.clientY;
    containerEl.style.cursor = 'grabbing';
  }

  function handleMouseMove(event: MouseEvent): void {
    if (!isDragging) return;
    const svg = containerEl?.querySelector('svg') as SVGSVGElement;
    if (!svg) return;

    const dx = event.clientX - lastX;
    const dy = event.clientY - lastY;
    translateX += dx;
    translateY += dy;
    lastX = event.clientX;
    lastY = event.clientY;
    updateTransform(svg);
  }

  function handleMouseUp(): void {
    isDragging = false;
    if (containerEl) {
      containerEl.style.cursor = 'grab';
    }
  }

  // Public methods
  export function zoomIn(): void {
    const svg = containerEl?.querySelector('svg') as SVGSVGElement;
    if (!svg) return;
    scale = Math.min(4, scale * 1.2);
    updateTransform(svg);
  }

  export function zoomOut(): void {
    const svg = containerEl?.querySelector('svg') as SVGSVGElement;
    if (!svg) return;
    scale = Math.max(0.1, scale / 1.2);
    updateTransform(svg);
  }

  export function resetZoom(): void {
    const svg = containerEl?.querySelector('svg') as SVGSVGElement;
    if (!svg) return;
    scale = 1;
    translateX = 0;
    translateY = 0;
    updateTransform(svg);
  }

  export function fitToView(): void {
    const svg = containerEl?.querySelector('svg') as SVGSVGElement;
    if (!svg || !containerEl) return;

    const containerRect = containerEl.getBoundingClientRect();
    const svgRect = svg.getBoundingClientRect();

    // Calculate scale to fit
    const scaleX = (containerRect.width - 40) / (svgRect.width / scale);
    const scaleY = (containerRect.height - 40) / (svgRect.height / scale);
    scale = Math.min(scaleX, scaleY, 1);

    // Center
    translateX = 0;
    translateY = 0;
    updateTransform(svg);
  }
</script>

<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<div
  class="mermaid-canvas"
  bind:this={containerEl}
  onwheel={handleWheel}
  onmousedown={handleMouseDown}
  onmousemove={handleMouseMove}
  onmouseup={handleMouseUp}
  onmouseleave={handleMouseUp}
  role="img"
  aria-label="Mermaid diagram"
></div>

<style>
  .mermaid-canvas {
    width: 100%;
    height: 100%;
    overflow: hidden;
    cursor: grab;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #fafafa;
  }

  .mermaid-canvas :global(svg) {
    max-width: none !important;
    height: auto;
    transition: transform 0.1s ease-out;
  }

  .mermaid-canvas :global(.render-error) {
    padding: 20px;
    text-align: center;
    color: #d32f2f;
  }

  .mermaid-canvas :global(.error-title) {
    font-size: 16px;
    font-weight: 600;
    margin-bottom: 10px;
  }

  .mermaid-canvas :global(.error-message) {
    font-size: 12px;
    background: #ffebee;
    padding: 10px;
    border-radius: 4px;
    text-align: left;
    overflow-x: auto;
    white-space: pre-wrap;
    word-break: break-word;
  }
</style>
