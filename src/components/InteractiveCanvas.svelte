<script lang="ts">
  import { onMount } from 'svelte';
  import mermaid from 'mermaid';
  import * as d3 from 'd3';

  interface Props {
    code: string;
    onError?: (error: string) => void;
    onNodeMove?: (nodeId: string, x: number, y: number) => void;
    onNodeSelect?: (nodeId: string | null) => void;
    /** 代码变更回调（拖拽节点后触发） */
    onCodeChange?: (code: string) => void;
    /** 删除节点回调 */
    onDeleteNode?: (nodeId: string) => void;
    /** 添加边回调 */
    onAddEdge?: (sourceId: string, targetId: string) => void;
    /** 是否显示网格背景 */
    showGrid?: boolean;
    /** 最小缩放比例 */
    minScale?: number;
    /** 最大缩放比例 */
    maxScale?: number;
  }

  let {
    code,
    onError,
    onNodeMove,
    onNodeSelect,
    onCodeChange,
    onDeleteNode,
    onAddEdge,
    showGrid = true,
    minScale = 0.1,
    maxScale = 4
  }: Props = $props();

  let containerEl: HTMLDivElement;
  let svgContainerEl: HTMLDivElement;
  let renderCounter = 0;
  let selectedNodeId: string | null = $state(null);

  // 边创建模式
  let edgeCreationMode = $state(false);
  let edgeCreationSource: string | null = null;

  // 节点位置信息
  interface NodeInfo {
    id: string;
    element: SVGGElement;
    x: number;
    y: number;
    width: number;
    height: number;
    originalTransform: string;
  }

  // 边信息
  interface EdgeInfo {
    id: string;
    element: SVGPathElement;
    sourceId: string;
    targetId: string;
    labelElement?: SVGGElement;
    originalPoints: string;
  }

  let nodeInfoMap = new Map<string, NodeInfo>();
  let edgeInfoList: EdgeInfo[] = [];

  // Initialize mermaid
  onMount(() => {
    mermaid.initialize({
      startOnLoad: false,
      theme: 'default',
      flowchart: {
        useMaxWidth: true,
        htmlLabels: false, // 使用 SVG 标签
        curve: 'basis',
      },
      securityLevel: 'loose',
    });
  });

  // Re-render when code changes
  $effect(() => {
    if (code && containerEl) {
      renderDiagram(code);
    }
  });

  async function renderDiagram(mermaidCode: string): Promise<void> {
    if (!svgContainerEl) return;

    const id = `mermaid-interactive-${++renderCounter}`;

    try {
      await mermaid.parse(mermaidCode);
      const { svg } = await mermaid.render(id, mermaidCode);

      svgContainerEl.innerHTML = svg;

      // 设置交互
      setupInteraction();
      setupZoomPan();
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : 'Render error';
      onError?.(errorMsg);
      svgContainerEl.innerHTML = `
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

  /**
   * 设置节点交互
   */
  function setupInteraction(): void {
    const svg = svgContainerEl?.querySelector('svg');
    if (!svg) return;

    // 清除之前的数据
    nodeInfoMap.clear();
    edgeInfoList = [];

    // 查找所有节点
    const nodeGroups = svg.querySelectorAll('g.node');
    nodeGroups.forEach((nodeGroup) => {
      const nodeEl = nodeGroup as SVGGElement;
      const nodeId = extractNodeId(nodeEl);
      if (!nodeId) return;

      // 获取节点位置
      const transform = nodeEl.getAttribute('transform') || '';
      const { x, y } = parseTransform(transform);
      const bbox = nodeEl.getBBox();

      nodeInfoMap.set(nodeId, {
        id: nodeId,
        element: nodeEl,
        x,
        y,
        width: bbox.width,
        height: bbox.height,
        originalTransform: transform,
      });

      // 添加拖拽功能
      setupNodeDrag(nodeEl, nodeId);

      // 添加点击选择/边创建
      nodeEl.addEventListener('click', (e) => {
        e.stopPropagation();

        if (edgeCreationMode) {
          // 边创建模式
          handleNodeClickForEdgeCreation(nodeId);
        } else {
          // 普通选择模式
          selectNode(nodeId);
        }
      });

      // 添加视觉反馈
      nodeEl.style.cursor = 'move';
    });

    // 查找所有边 - 使用多种选择器
    const edgePaths = svg.querySelectorAll(
      'path[data-edge="true"], path.flowchart-link, g.edgePaths path, .edgePath path'
    );

    // 查找所有边标签
    const edgeLabels = svg.querySelectorAll('g.edgeLabel');

    console.log('[InteractiveCanvas] Found nodes:', Array.from(nodeInfoMap.keys()));
    console.log('[InteractiveCanvas] Found edge paths:', edgePaths.length);
    console.log('[InteractiveCanvas] Found edge labels:', edgeLabels.length);

    let edgeIndex = 0;
    edgePaths.forEach((pathEl) => {
      const path = pathEl as SVGPathElement;
      const edgeId = path.getAttribute('data-id') || path.id || `edge-${edgeInfoList.length}`;
      const pointsData = path.getAttribute('data-points');

      // 尝试从 ID 或其他属性推断源和目标
      let { sourceId, targetId } = inferEdgeEndpoints(edgeId, path);

      // 如果无法推断，尝试通过几何位置匹配
      if (!sourceId || !targetId) {
        const endpoints = findEdgeEndpointsByGeometry(path);
        sourceId = endpoints.sourceId;
        targetId = endpoints.targetId;
      }

      if (sourceId && targetId && nodeInfoMap.has(sourceId) && nodeInfoMap.has(targetId)) {
        // 通过索引关联标签（Mermaid 的边和标签顺序一致）
        const labelEl = edgeLabels[edgeIndex] as SVGGElement | undefined;

        edgeInfoList.push({
          id: edgeId,
          element: path,
          sourceId,
          targetId,
          labelElement: labelEl,
          originalPoints: pointsData || '',
        });

        edgeIndex++;
      }
    });

    console.log('[InteractiveCanvas] Registered edges:', edgeInfoList.length);

    // 点击空白处取消选择
    svg.addEventListener('click', (e) => {
      if (e.target === svg || (e.target as Element).tagName === 'rect') {
        selectNode(null);
      }
    });
  }

  /**
   * 从节点元素提取 ID
   */
  function extractNodeId(nodeEl: SVGGElement): string | null {
    // 尝试从 data-id 属性获取
    let id = nodeEl.getAttribute('data-id');
    if (id) return id;

    // 尝试从 id 属性获取（去除前缀）
    id = nodeEl.id;
    if (id) {
      // Mermaid 生成的 ID 格式: flowchart-NodeId-123
      const match = id.match(/flowchart-(.+?)-\d+$/);
      if (match) return match[1];
      return id;
    }

    return null;
  }

  /**
   * 解析 transform 属性
   */
  function parseTransform(transform: string): { x: number; y: number } {
    const match = transform.match(/translate\(([^,]+),?\s*([^)]*)\)/);
    if (match) {
      return {
        x: parseFloat(match[1]) || 0,
        y: parseFloat(match[2]) || 0,
      };
    }
    return { x: 0, y: 0 };
  }

  /**
   * 推断边的端点
   */
  function inferEdgeEndpoints(
    edgeId: string,
    path: SVGPathElement
  ): { sourceId: string | null; targetId: string | null } {
    // 尝试从 ID 解析: L-NodeA-NodeB-0 或 L_NodeA_NodeB_0
    let match = edgeId.match(/^L[-_](.+?)[-_](.+?)[-_]\d+$/);
    if (match) {
      return { sourceId: match[1], targetId: match[2] };
    }

    // 尝试从 data-start 和 data-end 属性获取
    const dataStart = path.getAttribute('data-start');
    const dataEnd = path.getAttribute('data-end');
    if (dataStart && dataEnd) {
      return { sourceId: dataStart, targetId: dataEnd };
    }

    // 尝试从父元素的 class 或 id 推断
    const parent = path.parentElement;
    if (parent) {
      const parentId = parent.id || parent.getAttribute('data-id');
      if (parentId) {
        match = parentId.match(/(.+?)[-_](.+?)$/);
        if (match) {
          return { sourceId: match[1], targetId: match[2] };
        }
      }
    }

    // 尝试其他格式
    const parts = edgeId.split(/[-_]/);
    if (parts.length >= 3) {
      return { sourceId: parts[1], targetId: parts[2] };
    }

    return { sourceId: null, targetId: null };
  }

  /**
   * 通过几何位置查找边的端点
   */
  function findEdgeEndpointsByGeometry(
    path: SVGPathElement
  ): { sourceId: string | null; targetId: string | null } {
    try {
      const pathLength = path.getTotalLength();
      if (pathLength === 0) return { sourceId: null, targetId: null };

      // 获取路径的起点和终点
      const startPoint = path.getPointAtLength(0);
      const endPoint = path.getPointAtLength(pathLength);

      let sourceId: string | null = null;
      let targetId: string | null = null;
      let minStartDist = Infinity;
      let minEndDist = Infinity;

      // 查找最近的节点
      for (const [nodeId, nodeInfo] of nodeInfoMap) {
        const nodeCenterX = nodeInfo.x;
        const nodeCenterY = nodeInfo.y;

        // 计算到起点的距离
        const startDist = Math.hypot(startPoint.x - nodeCenterX, startPoint.y - nodeCenterY);
        if (startDist < minStartDist && startDist < nodeInfo.width + nodeInfo.height) {
          minStartDist = startDist;
          sourceId = nodeId;
        }

        // 计算到终点的距离
        const endDist = Math.hypot(endPoint.x - nodeCenterX, endPoint.y - nodeCenterY);
        if (endDist < minEndDist && endDist < nodeInfo.width + nodeInfo.height) {
          minEndDist = endDist;
          targetId = nodeId;
        }
      }

      return { sourceId, targetId };
    } catch {
      return { sourceId: null, targetId: null };
    }
  }

  /**
   * 查找边的标签元素
   */
  function findEdgeLabel(svg: SVGSVGElement, edgeId: string): SVGGElement | null {
    // 查找 edgeLabel 组 - 尝试多种方式
    const labels = svg.querySelectorAll('g.edgeLabel');

    for (const label of labels) {
      // 方式1: 通过 data-id 属性
      const dataId = label.querySelector('[data-id]')?.getAttribute('data-id');
      if (dataId === edgeId) {
        return label as SVGGElement;
      }

      // 方式2: 通过 id 属性
      if (label.id === edgeId || label.id === `edgeLabel-${edgeId}`) {
        return label as SVGGElement;
      }
    }

    return null;
  }

  /**
   * 查找所有边标签并建立映射
   */
  function findAllEdgeLabels(svg: SVGSVGElement): Map<number, SVGGElement> {
    const labelMap = new Map<number, SVGGElement>();
    const labels = svg.querySelectorAll('g.edgeLabel');

    labels.forEach((label, index) => {
      labelMap.set(index, label as SVGGElement);
    });

    return labelMap;
  }

  /**
   * 设置节点拖拽
   */
  function setupNodeDrag(nodeEl: SVGGElement, nodeId: string): void {
    let isDragging = false;
    let startX = 0;
    let startY = 0;
    let nodeStartX = 0;
    let nodeStartY = 0;

    const onMouseDown = (e: MouseEvent) => {
      if (e.button !== 0) return;
      e.preventDefault();
      e.stopPropagation();

      isDragging = true;
      startX = e.clientX;
      startY = e.clientY;

      const nodeInfo = nodeInfoMap.get(nodeId);
      if (nodeInfo) {
        nodeStartX = nodeInfo.x;
        nodeStartY = nodeInfo.y;
      }

      selectNode(nodeId);

      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;

      const dx = (e.clientX - startX) / scale;
      const dy = (e.clientY - startY) / scale;

      const newX = nodeStartX + dx;
      const newY = nodeStartY + dy;

      // 更新节点位置
      updateNodePosition(nodeId, newX, newY);
    };

    const onMouseUp = () => {
      if (isDragging) {
        isDragging = false;
        const nodeInfo = nodeInfoMap.get(nodeId);
        if (nodeInfo) {
          onNodeMove?.(nodeId, nodeInfo.x, nodeInfo.y);
        }
      }
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };

    nodeEl.addEventListener('mousedown', onMouseDown);
  }

  /**
   * 更新节点位置
   */
  function updateNodePosition(nodeId: string, x: number, y: number): void {
    const nodeInfo = nodeInfoMap.get(nodeId);
    if (!nodeInfo) return;

    // 更新节点 transform
    nodeInfo.x = x;
    nodeInfo.y = y;
    nodeInfo.element.setAttribute('transform', `translate(${x}, ${y})`);

    // 更新相关的边
    updateConnectedEdges(nodeId);

    // 更新 SVG viewBox 以适应新位置
    updateSvgViewBox();
  }

  /**
   * 更新 SVG viewBox 以适应所有节点（无限画布模式下不再限制 viewBox）
   */
  function updateSvgViewBox(): void {
    // 无限画布模式下，不需要更新 viewBox
    // 节点可以自由移动到任何位置
  }

  /**
   * 更新与节点相连的边
   */
  function updateConnectedEdges(nodeId: string): void {
    for (const edge of edgeInfoList) {
      if (edge.sourceId === nodeId || edge.targetId === nodeId) {
        updateEdgePath(edge);
      }
    }
  }

  /**
   * 更新边的路径
   */
  function updateEdgePath(edge: EdgeInfo): void {
    const sourceNode = nodeInfoMap.get(edge.sourceId);
    const targetNode = nodeInfoMap.get(edge.targetId);

    if (!sourceNode || !targetNode) return;

    // 计算新的路径点
    const points = calculateEdgePoints(sourceNode, targetNode);

    // 生成新的路径
    const pathD = generateCurvePath(points);
    edge.element.setAttribute('d', pathD);

    // 更新标签位置 - 使用路径的实际中点
    if (edge.labelElement) {
      try {
        const pathLength = edge.element.getTotalLength();
        const midPoint = edge.element.getPointAtLength(pathLength / 2);
        edge.labelElement.setAttribute('transform', `translate(${midPoint.x}, ${midPoint.y})`);
      } catch {
        // 如果无法获取路径长度，使用计算的中点
        const midPoint = points[Math.floor(points.length / 2)];
        edge.labelElement.setAttribute('transform', `translate(${midPoint.x}, ${midPoint.y})`);
      }
    }
  }

  /**
   * 计算边的路径点
   */
  function calculateEdgePoints(
    source: NodeInfo,
    target: NodeInfo
  ): Array<{ x: number; y: number }> {
    // 计算源和目标的中心点
    const sourceCenter = { x: source.x, y: source.y };
    const targetCenter = { x: target.x, y: target.y };

    // 计算方向
    const dx = targetCenter.x - sourceCenter.x;
    const dy = targetCenter.y - sourceCenter.y;

    // 计算边界交点
    const sourcePoint = getIntersectionPoint(sourceCenter, { x: dx, y: dy }, source);
    const targetPoint = getIntersectionPoint(targetCenter, { x: -dx, y: -dy }, target);

    // 生成中间点（用于曲线）
    const midX = (sourcePoint.x + targetPoint.x) / 2;
    const midY = (sourcePoint.y + targetPoint.y) / 2;

    // 根据方向添加控制点
    if (Math.abs(dy) > Math.abs(dx)) {
      // 主要是垂直方向
      return [
        sourcePoint,
        { x: sourcePoint.x, y: midY },
        { x: targetPoint.x, y: midY },
        targetPoint,
      ];
    } else {
      // 主要是水平方向
      return [
        sourcePoint,
        { x: midX, y: sourcePoint.y },
        { x: midX, y: targetPoint.y },
        targetPoint,
      ];
    }
  }

  /**
   * 计算从中心点到边界的交点
   */
  function getIntersectionPoint(
    center: { x: number; y: number },
    direction: { x: number; y: number },
    node: NodeInfo
  ): { x: number; y: number } {
    const hw = node.width / 2;
    const hh = node.height / 2;

    const angle = Math.atan2(direction.y, direction.x);
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);

    let t: number;
    if (Math.abs(cos) * hh > Math.abs(sin) * hw) {
      t = hw / Math.abs(cos);
    } else {
      t = hh / Math.abs(sin);
    }

    return {
      x: center.x + cos * t,
      y: center.y + sin * t,
    };
  }

  /**
   * 生成曲线路径
   */
  function generateCurvePath(points: Array<{ x: number; y: number }>): string {
    if (points.length < 2) return '';

    const lineGenerator = d3
      .line<{ x: number; y: number }>()
      .x((d) => d.x)
      .y((d) => d.y)
      .curve(d3.curveBasis);

    return lineGenerator(points) || '';
  }

  /**
   * 选择节点
   */
  function selectNode(nodeId: string | null): void {
    // 移除之前的选中状态
    if (selectedNodeId) {
      const prevNode = nodeInfoMap.get(selectedNodeId);
      if (prevNode) {
        prevNode.element.classList.remove('selected');
      }
    }

    selectedNodeId = nodeId;

    // 添加新的选中状态
    if (nodeId) {
      const node = nodeInfoMap.get(nodeId);
      if (node) {
        node.element.classList.add('selected');
      }
    }

    onNodeSelect?.(nodeId);
  }

  /**
   * 处理边创建模式下的节点点击
   */
  function handleNodeClickForEdgeCreation(nodeId: string): void {
    if (!edgeCreationSource) {
      // 第一次点击，设置源节点
      edgeCreationSource = nodeId;
      // 高亮源节点
      const nodeInfo = nodeInfoMap.get(nodeId);
      if (nodeInfo) {
        nodeInfo.element.classList.add('edge-source');
      }
      // 更新光标提示
      if (containerEl) {
        containerEl.style.cursor = 'crosshair';
      }
    } else if (edgeCreationSource === nodeId) {
      // 点击同一个节点，取消边创建
      cancelEdgeCreation();
    } else {
      // 第二次点击，创建边
      onAddEdge?.(edgeCreationSource, nodeId);
      cancelEdgeCreation();
    }
  }

  /**
   * 取消边创建模式
   */
  function cancelEdgeCreation(): void {
    // 清除源节点高亮
    if (edgeCreationSource) {
      const nodeInfo = nodeInfoMap.get(edgeCreationSource);
      if (nodeInfo) {
        nodeInfo.element.classList.remove('edge-source');
      }
    }

    edgeCreationSource = null;

    // 恢复光标
    if (containerEl) {
      containerEl.style.cursor = 'default';
    }
  }

  /**
   * 切换边创建模式
   */
  export function toggleEdgeCreation(): void {
    edgeCreationMode = !edgeCreationMode;
    if (!edgeCreationMode) {
      cancelEdgeCreation();
    }
  }

  /**
   * 设置边创建模式
   */
  export function setEdgeCreationMode(enabled: boolean): void {
    edgeCreationMode = enabled;
    if (!enabled) {
      cancelEdgeCreation();
    }
  }

  /**
   * 获取当前边创建模式状态
   */
  export function getEdgeCreationMode(): boolean {
    return edgeCreationMode;
  }

  // Zoom/Pan - 无限画布模式
  let scale = $state(1);
  let translateX = $state(0);
  let translateY = $state(0);
  let isPanning = false;
  let lastX = 0;
  let lastY = 0;

  // 初始 SVG 尺寸（用于居中）
  let initialSvgWidth = 0;
  let initialSvgHeight = 0;

  function setupZoomPan(): void {
    const svg = svgContainerEl?.querySelector('svg');
    if (!svg) return;

    // 获取 SVG 原始尺寸
    const bbox = svg.getBBox();
    initialSvgWidth = bbox.width + bbox.x * 2;
    initialSvgHeight = bbox.height + bbox.y * 2;

    // 移除 Mermaid 设置的 max-width 限制
    svg.style.maxWidth = 'none';
    svg.style.width = 'auto';
    svg.style.height = 'auto';

    // 初始居中
    centerContent();
  }

  /**
   * 居中内容
   */
  function centerContent(): void {
    if (!containerEl || !svgContainerEl) return;
    const containerRect = containerEl.getBoundingClientRect();

    // 计算居中位置
    translateX = (containerRect.width - initialSvgWidth * scale) / 2;
    translateY = (containerRect.height - initialSvgHeight * scale) / 2;
  }

  /**
   * 更新 SVG 容器的 transform
   */
  function updateTransform(): void {
    if (!svgContainerEl) return;
    svgContainerEl.style.transform = `translate(${translateX}px, ${translateY}px) scale(${scale})`;
  }

  // 响应式更新 transform
  $effect(() => {
    updateTransform();
  });

  /**
   * 鼠标滚轮缩放 - 以鼠标位置为中心
   */
  function handleWheel(event: WheelEvent): void {
    event.preventDefault();
    if (!containerEl) return;

    const rect = containerEl.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;

    // 计算鼠标在内容坐标系中的位置
    const contentX = (mouseX - translateX) / scale;
    const contentY = (mouseY - translateY) / scale;

    // 计算新的缩放比例
    const delta = event.deltaY > 0 ? 0.9 : 1.1;
    const newScale = Math.max(minScale, Math.min(maxScale, scale * delta));

    // 调整平移以保持鼠标位置不变
    translateX = mouseX - contentX * newScale;
    translateY = mouseY - contentY * newScale;
    scale = newScale;
  }

  function handleMouseDown(event: MouseEvent): void {
    // 只有在空白处才开始平移
    const target = event.target as Element;
    if (target.closest('g.node')) return;

    if (event.button !== 0) return;
    isPanning = true;
    lastX = event.clientX;
    lastY = event.clientY;
    containerEl.style.cursor = 'grabbing';
  }

  function handleMouseMove(event: MouseEvent): void {
    if (!isPanning) return;

    const dx = event.clientX - lastX;
    const dy = event.clientY - lastY;
    translateX += dx;
    translateY += dy;
    lastX = event.clientX;
    lastY = event.clientY;
  }

  function handleMouseUp(): void {
    isPanning = false;
    if (containerEl) {
      containerEl.style.cursor = 'default';
    }
  }

  /**
   * 键盘事件处理
   */
  function handleKeyDown(event: KeyboardEvent): void {
    // Delete 或 Backspace 删除选中的节点
    if ((event.key === 'Delete' || event.key === 'Backspace') && selectedNodeId) {
      event.preventDefault();
      onDeleteNode?.(selectedNodeId);
      selectedNodeId = null;
    }

    // Escape 取消选择或边创建
    if (event.key === 'Escape') {
      event.preventDefault();
      if (edgeCreationMode) {
        cancelEdgeCreation();
      }
      if (selectedNodeId) {
        selectedNodeId = null;
        onNodeSelect?.(null);
      }
    }
  }

  // Public methods
  export function zoomIn(): void {
    if (!containerEl) return;
    const rect = containerEl.getBoundingClientRect();
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const contentX = (centerX - translateX) / scale;
    const contentY = (centerY - translateY) / scale;

    const newScale = Math.min(maxScale, scale * 1.2);
    translateX = centerX - contentX * newScale;
    translateY = centerY - contentY * newScale;
    scale = newScale;
  }

  export function zoomOut(): void {
    if (!containerEl) return;
    const rect = containerEl.getBoundingClientRect();
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const contentX = (centerX - translateX) / scale;
    const contentY = (centerY - translateY) / scale;

    const newScale = Math.max(minScale, scale / 1.2);
    translateX = centerX - contentX * newScale;
    translateY = centerY - contentY * newScale;
    scale = newScale;
  }

  export function resetZoom(): void {
    scale = 1;
    centerContent();
  }

  export function fitToView(): void {
    if (!containerEl || !svgContainerEl) return;

    const containerRect = containerEl.getBoundingClientRect();
    const padding = 40;

    // 计算适合的缩放比例
    const scaleX = (containerRect.width - padding * 2) / initialSvgWidth;
    const scaleY = (containerRect.height - padding * 2) / initialSvgHeight;
    scale = Math.min(scaleX, scaleY, 1);

    // 居中
    centerContent();
  }

  /**
   * 获取当前缩放比例
   */
  export function getScale(): number {
    return scale;
  }

  /**
   * 获取当前平移位置
   */
  export function getTranslate(): { x: number; y: number } {
    return { x: translateX, y: translateY };
  }
</script>

<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
<div
  class="interactive-canvas"
  class:show-grid={showGrid}
  bind:this={containerEl}
  onwheel={handleWheel}
  onmousedown={handleMouseDown}
  onmousemove={handleMouseMove}
  onmouseup={handleMouseUp}
  onmouseleave={handleMouseUp}
  onkeydown={handleKeyDown}
  role="application"
  aria-label="Interactive Mermaid diagram"
  tabindex="0"
>
  <div class="svg-container" bind:this={svgContainerEl}></div>

  <!-- 缩放指示器 -->
  <div class="zoom-indicator">{Math.round(scale * 100)}%</div>
</div>

<style>
  .interactive-canvas {
    width: 100%;
    height: 100%;
    overflow: hidden;
    cursor: default;
    position: relative;
    background: #fafafa;
  }

  /* 网格背景 */
  .interactive-canvas.show-grid {
    background-image:
      linear-gradient(rgba(0, 0, 0, 0.05) 1px, transparent 1px),
      linear-gradient(90deg, rgba(0, 0, 0, 0.05) 1px, transparent 1px);
    background-size: 20px 20px;
    background-position: -1px -1px;
  }

  /* SVG 容器 - 用于 transform */
  .svg-container {
    position: absolute;
    top: 0;
    left: 0;
    transform-origin: 0 0;
    will-change: transform;
  }

  .svg-container :global(svg) {
    max-width: none !important;
    display: block;
  }

  /* 缩放指示器 */
  .zoom-indicator {
    position: absolute;
    bottom: 12px;
    right: 12px;
    padding: 4px 8px;
    background: rgba(0, 0, 0, 0.6);
    color: white;
    font-size: 12px;
    font-family: monospace;
    border-radius: 4px;
    pointer-events: none;
    user-select: none;
  }

  /* 节点悬停效果 */
  .svg-container :global(g.node) {
    cursor: move;
  }

  .svg-container :global(g.node:hover .label-container),
  .svg-container :global(g.node:hover rect),
  .svg-container :global(g.node:hover polygon),
  .svg-container :global(g.node:hover circle) {
    filter: brightness(0.95);
  }

  /* 选中状态 */
  .svg-container :global(g.node.selected .label-container),
  .svg-container :global(g.node.selected rect),
  .svg-container :global(g.node.selected polygon),
  .svg-container :global(g.node.selected circle) {
    stroke: #1976d2 !important;
    stroke-width: 2px !important;
  }

  /* 边创建源节点状态 */
  .svg-container :global(g.node.edge-source .label-container),
  .svg-container :global(g.node.edge-source rect),
  .svg-container :global(g.node.edge-source polygon),
  .svg-container :global(g.node.edge-source circle) {
    stroke: #4caf50 !important;
    stroke-width: 3px !important;
    stroke-dasharray: 5,5 !important;
    animation: edge-pulse 1s ease-in-out infinite;
  }

  @keyframes edge-pulse {
    0% { opacity: 1; }
    50% { opacity: 0.7; }
    100% { opacity: 1; }
  }

  .svg-container :global(.render-error) {
    padding: 20px;
    text-align: center;
    color: #d32f2f;
  }

  .svg-container :global(.error-title) {
    font-size: 16px;
    font-weight: 600;
    margin-bottom: 10px;
  }

  .svg-container :global(.error-message) {
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
