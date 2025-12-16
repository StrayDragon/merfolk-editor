<script lang="ts">
  import { onMount } from 'svelte';
  import mermaid from 'mermaid';
  import * as d3 from 'd3';
  import { MermaidParser } from '../core/parser/MermaidParser';
  import type { FlowEdge } from '../core/model/Edge';

  interface Props {
    code: string;
    /** Error callback (null = no error) */
    onError?: (error: string | null) => void;
    onNodeMove?: (nodeId: string, x: number, y: number) => void;
    onNodeSelect?: (nodeId: string | null) => void;
    /** 删除节点回调 */
    onDeleteNode?: (nodeId: string) => void;
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
    onDeleteNode,
    showGrid = true,
    minScale = 0.1,
    maxScale = 4
  }: Props = $props();

  let containerEl: HTMLDivElement;
  let svgContainerEl: HTMLDivElement;
  let renderCounter = 0;
  let selectedNodeId: string | null = $state(null);

  // Parser 实例用于解析代码和获取边信息
  const parser = new MermaidParser();

  type Point = { x: number; y: number };
  type RelativePoint = { t: number; offsetRatio: number };

  // 节点位置信息
  interface NodeInfo {
    id: string;
    element: SVGGElement;
    x: number;
    y: number;
    width: number;
    height: number;
    originalTransform: string;
    initialX: number;
    initialY: number;
  }

  // 边信息
  interface EdgeInfo {
    id: string;
    element: SVGPathElement;
    sourceId: string;
    targetId: string;
    labelElement?: SVGGElement | SVGTextElement;
    labelText?: string;
    originalPoints: string;
    decodedPoints?: Point[];
    relativePoints?: RelativePoint[];
    markerStart?: string; // 保存起始箭头标记
    markerEnd?: string;   // 保存结束箭头标记
    cssClasses?: string;  // 保存CSS类
    stroke?: string;      // 保存边颜色
    strokeWidth?: string; // 保存边宽度
  }

  interface EdgePathCandidate {
    path: SVGPathElement;
    endpoints: { sourceId: string | null; targetId: string | null };
    originalPoints: string;
    decodedPoints?: Point[];
    markerStart?: string | null;
    markerEnd?: string | null;
    cssClasses?: string | null;
    stroke?: string | null;
    strokeWidth?: string | null;
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
      // 首先尝试解析代码
      await mermaid.parse(mermaidCode);

      // 解析成功，渲染图表
      const { svg } = await mermaid.render(id, mermaidCode);
      svgContainerEl.innerHTML = svg;

      // 设置交互（传递解析后的模型信息）
      setupInteraction(mermaidCode);
      setupZoomPan();

      // 清除之前的错误状态
      onError?.(null);
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : 'Render error';

      // 通知父组件有错误，但不破坏画布
      onError?.(errorMsg);

      // 尝试渲染一个简单的占位符或保持之前的画布状态
      if (!svgContainerEl.querySelector('svg')) {
        // 只有当画布为空时才显示占位符
        svgContainerEl.innerHTML = `
          <div class="canvas-placeholder">
            <div class="placeholder-content">
              <div class="placeholder-icon">📝</div>
              <div class="placeholder-text">
                <h3>Waiting for valid code...</h3>
                <p>Fix the syntax error in the code panel to see your diagram</p>
              </div>
            </div>
          </div>
        `;
      }
      // 如果已经有画布内容，保持不变，让用户继续操作
    }
  }

  /**
   * 设置节点交互
   */
  function setupInteraction(mermaidCode: string): void {
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
        initialX: x,
        initialY: y,
      });

      // 添加拖拽功能
      setupNodeDrag(nodeEl, nodeId);

      // 添加点击选择
      nodeEl.addEventListener('click', (e) => {
        e.stopPropagation();
        selectNode(nodeId);
      });

      // 添加视觉反馈
      nodeEl.style.cursor = 'move';
    });

    // 解析代码获取边的结构信息
    let model;
    try {
      model = parser.parse(mermaidCode);
    } catch (e) {
      console.warn('[InteractiveCanvas] Failed to parse code for edge matching:', e);
      model = null;
    }

    // 查找所有边和标签（转换为数组以避免 NodeList 的兼容性问题）
    const edgePathList = Array.from(
      svg.querySelectorAll(
        'path[data-edge="true"], path.flowchart-link, g.edgePaths path, .edgePath path'
      )
    ) as SVGPathElement[];

    // 查找边标签元素 - 仅限 Mermaid 生成的 edgeLabel 容器
    const rawEdgeLabels = Array.from(
      svg.querySelectorAll<SVGElement>('g.edgeLabel, g.edge-label, g.edgeLabel *, g.edge-label *')
    );
    const edgeLabelSet = new Set<SVGGElement>();
    rawEdgeLabels.forEach((el) => {
      const g = el instanceof SVGTextElement
        ? (el.parentElement as SVGGElement | null) ?? (el as unknown as SVGGElement)
        : (el as SVGGElement);
      if (g) {
        const container = g.closest('g.edgeLabel, g.edge-label') as SVGGElement | null;
        edgeLabelSet.add(container ?? g);
      }
    });
    const edgeLabelList = Array.from(edgeLabelSet);
    // Hide Mermaid-rendered edge labels to avoid duplicates; we will draw our own overlays
    edgeLabelList.forEach(label => {
      label.style.opacity = '0';
      label.style.pointerEvents = 'none';
    });

    if (model && model.edges.length > 0) {
      const candidates = buildEdgePathCandidates(edgePathList);
      const usedPaths = new Set<SVGPathElement>();
      const usedLabels = new Set<number>();

      model.edges.forEach((edge) => {
        const pathCandidate = findPathForEdge(edge, candidates, usedPaths);
        if (!pathCandidate) {
          console.warn(`[InteractiveCanvas] Could not find path for edge ${edge.id}`);
          return;
        }

        usedPaths.add(pathCandidate.path);
        const directLabel = findLabelForEdge(edge.id, svg);
        const labelElement =
          directLabel.labelElement ??
          pickLabelForPath(pathCandidate.path, edgeLabelList, usedLabels);
        const overlayLabel = edge.text ? createOverlayLabel(pathCandidate.path, edge.text) : undefined;
        // 避免重复显示 Mermaid 原标签
        if (labelElement) {
          labelElement.style.opacity = '0';
        }
        const initialLabel = overlayLabel ?? labelElement;
        if (initialLabel) {
          const pos = getLabelPositionFromPath(
            pathCandidate.path,
            pathCandidate.decodedPoints ?? []
          );
          initialLabel.setAttribute('transform', `translate(${pos.x}, ${pos.y})`);
        }

        const sourceInfo = nodeInfoMap.get(edge.source);
        const targetInfo = nodeInfoMap.get(edge.target);
        const decodedPoints = pathCandidate.decodedPoints;
        const relativePoints =
          decodedPoints && sourceInfo && targetInfo
            ? buildRelativePoints(decodedPoints, sourceInfo, targetInfo)
            : undefined;

        edgeInfoList.push({
          id: edge.id,
          element: pathCandidate.path,
          sourceId: edge.source,
          targetId: edge.target,
          labelElement: overlayLabel ?? labelElement,
          labelText: edge.text,
          originalPoints: pathCandidate.originalPoints,
          decodedPoints,
          relativePoints,
          markerStart: pathCandidate.markerStart ?? undefined,
          markerEnd: pathCandidate.markerEnd ?? undefined,
          cssClasses: pathCandidate.cssClasses ?? undefined,
          stroke: pathCandidate.stroke ?? undefined,
          strokeWidth: pathCandidate.strokeWidth ?? undefined,
        });
      });
    } else {
      // 后备方案：使用几何匹配
      const usedLabels = new Set<number>();
      edgePathList.forEach((path, index) => {
        const endpoints = resolveEdgeEndpoints(path);
        if (endpoints.sourceId && endpoints.targetId) {
          const decodedPoints = decodeEdgePoints(path.getAttribute('data-points'));
          const sourceInfo = nodeInfoMap.get(endpoints.sourceId);
          const targetInfo = nodeInfoMap.get(endpoints.targetId);
          const relativePoints =
            decodedPoints && sourceInfo && targetInfo
              ? buildRelativePoints(decodedPoints, sourceInfo, targetInfo)
              : undefined;
          const pickedLabel = pickLabelForPath(path, edgeLabelList, usedLabels);
          const overlayLabel =
            pickedLabel && pickedLabel.textContent
              ? createOverlayLabel(path, pickedLabel.textContent.trim())
              : undefined;
          if (pickedLabel) {
            pickedLabel.style.opacity = '0';
          }
          const initialLabel = overlayLabel ?? pickedLabel;
          if (initialLabel) {
            const pos = getLabelPositionFromPath(path, decodedPoints ?? []);
            initialLabel.setAttribute('transform', `translate(${pos.x}, ${pos.y})`);
          }

          edgeInfoList.push({
            id: `edge-${index}`,
            element: path,
            sourceId: endpoints.sourceId,
            targetId: endpoints.targetId,
            labelElement: overlayLabel ?? pickedLabel,
            labelText: overlayLabel ? overlayLabel.textContent ?? undefined : pickedLabel?.textContent ?? undefined,
            originalPoints: path.getAttribute('data-points') || '',
            decodedPoints,
            relativePoints,
            markerStart: path.getAttribute('marker-start') ?? undefined,
            markerEnd: path.getAttribute('marker-end') ?? undefined,
            cssClasses: path.getAttribute('class') ?? undefined,
            stroke: path.getAttribute('stroke') ?? undefined,
            strokeWidth: path.getAttribute('stroke-width') ?? undefined,
          });
        }
      });
    }

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
   * 解码 Mermaid 存在 data-points 上的路径信息
   */
  function decodeEdgePoints(encoded: string | null): Point[] | null {
    if (!encoded || typeof atob !== 'function') return null;

    try {
      const decoded = atob(encoded);
      const raw = JSON.parse(decoded);
      if (Array.isArray(raw)) {
        return raw
          .map((p) => ({
            x: Number(p.x),
            y: Number(p.y),
          }))
          .filter((p) => Number.isFinite(p.x) && Number.isFinite(p.y));
      }
    } catch (error) {
      console.warn('[InteractiveCanvas] Failed to decode edge points', error);
    }

    return null;
  }

  /**
   * 构建边路径候选列表，带上端点和样式信息
   */
  function buildEdgePathCandidates(paths: SVGPathElement[]): EdgePathCandidate[] {
    return paths.map((path) => ({
      path,
      endpoints: resolveEdgeEndpoints(path),
      originalPoints: path.getAttribute('data-points') || '',
      decodedPoints: decodeEdgePoints(path.getAttribute('data-points')),
      markerStart: path.getAttribute('marker-start'),
      markerEnd: path.getAttribute('marker-end'),
      cssClasses: path.getAttribute('class'),
      stroke: path.getAttribute('stroke'),
      strokeWidth: path.getAttribute('stroke-width'),
    }));
  }

  /**
   * 根据几何或属性推断边的端点
   */
  function resolveEdgeEndpoints(
    path: SVGPathElement
  ): { sourceId: string | null; targetId: string | null } {
    const geometry = findEdgeEndpointsByGeometry(path);
    if (geometry.sourceId && geometry.targetId) {
      return geometry;
    }
    const inferred = inferEdgeEndpoints(path.id, path);
    if (inferred.sourceId && inferred.targetId) {
      return inferred;
    }
    return geometry;
  }

  /**
   * 选择与模型边匹配的路径
   */
  function findPathForEdge(
    edge: FlowEdge,
    candidates: EdgePathCandidate[],
    usedPaths: Set<SVGPathElement>
  ): EdgePathCandidate | undefined {
    const directMatch = candidates.find(
      (c) =>
        !usedPaths.has(c.path) &&
        c.endpoints.sourceId === edge.source &&
        c.endpoints.targetId === edge.target
    );
    if (directMatch) return directMatch;

    // 对于双向边，允许任意方向匹配
    if (isBidirectionalEdge(edge)) {
      const reversed = candidates.find(
        (c) =>
          !usedPaths.has(c.path) &&
          c.endpoints.sourceId === edge.target &&
          c.endpoints.targetId === edge.source
      );
      if (reversed) return reversed;
    }

    // 宽松匹配：只要任一端点对得上就优先使用
    const looseMatch = candidates.find(
      (c) =>
        !usedPaths.has(c.path) &&
        (c.endpoints.sourceId === edge.source ||
          c.endpoints.targetId === edge.target ||
          c.endpoints.sourceId === edge.target ||
          c.endpoints.targetId === edge.source)
    );
    if (looseMatch) return looseMatch;

    // 最后回退到任意未使用的路径
    return candidates.find((c) => !usedPaths.has(c.path));
  }

  function isBidirectionalEdge(edge: FlowEdge): boolean {
    return edge.arrowStart === 'arrow' && edge.arrowEnd === 'arrow';
  }

  /**
   * 为路径挑选最近的标签，避免重复使用
   */
  function pickLabelForPath(
    path: SVGPathElement,
    labels: SVGGElement[],
    used: Set<number>
  ): SVGGElement | undefined {
    if (labels.length === 0) return undefined;

    const pathBox = path.getBBox();
    const pathCenter = {
      x: pathBox.x + pathBox.width / 2,
      y: pathBox.y + pathBox.height / 2,
    };

    // 记录所有候选标签的分数
    const candidates: Array<{ index: number; score: number; distance: number; hasText: boolean }> = [];

    labels.forEach((label, index) => {
      if (used.has(index)) return;

      const textElement = label.querySelector('text');
      const labelText = textElement?.textContent?.trim() || '';

      const box = label.getBBox();
      const labelCenter = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
      const distance = Math.hypot(labelCenter.x - pathCenter.x, labelCenter.y - pathCenter.y);

      // 计算匹配分数：距离越近分数越高，有文本的标签分数更高
      let score = 0;
      if (labelText) {
        // 有文本的标签优先，但距离不能太远
        score = distance < 150 ? 1000 - distance : 0;
      } else {
        // 没有文本的标签，只有在距离很近时才选择
        score = distance < 50 ? 500 - distance : 0;
      }

      if (score > 0) {
        candidates.push({ index, score, distance, hasText: !!labelText });
      }
    });

    // 按分数排序，分数高的优先
    candidates.sort((a, b) => b.score - a.score);

    if (candidates.length > 0) {
      const best = candidates[0];
      used.add(best.index);
      return labels[best.index];
    }

    return undefined;
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
   * 计算 SVG viewBox 以适应所有节点位置
   */
  function calculateDynamicViewBox(): { minX: number; minY: number; width: number; height: number } | null {
    if (nodeInfoMap.size === 0) return null;

    // 计算所有节点的边界
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    for (const nodeInfo of nodeInfoMap.values()) {
      // 获取节点的实际边界框
      const bbox = nodeInfo.element.getBBox();
      const nodeX = nodeInfo.x;
      const nodeY = nodeInfo.y;

      minX = Math.min(minX, nodeX + bbox.x);
      minY = Math.min(minY, nodeY + bbox.y);
      maxX = Math.max(maxX, nodeX + bbox.x + bbox.width);
      maxY = Math.max(maxY, nodeY + bbox.y + bbox.height);
    }

    // 添加边距（确保节点不会贴着边界）
    const padding = 50;
    minX -= padding;
    minY -= padding;
    maxX += padding;
    maxY += padding;

    return {
      minX,
      minY,
      width: maxX - minX,
      height: maxY - minY
    };
  }

  /**
   * 更新 SVG viewBox 以适应所有节点（支持无限画布）
   */
  function updateSvgViewBox(): void {
    const svg = svgContainerEl?.querySelector('svg');
    if (!svg) return;

    const viewBox = calculateDynamicViewBox();
    if (viewBox) {
      // 设置 viewBox 以包含所有节点
      svg.setAttribute('viewBox', `${viewBox.minX} ${viewBox.minY} ${viewBox.width} ${viewBox.height}`);

      // 同时更新 SVG 的尺寸以避免裁剪
      svg.style.width = `${viewBox.width}px`;
      svg.style.height = `${viewBox.height}px`;
    }
  }

  /**
   * 将绝对坐标的路径点转换为相对（沿连线 + 垂直偏移）的表示
   */
  function buildRelativePoints(points: Point[], source: NodeInfo, target: NodeInfo): RelativePoint[] {
    const dirX = target.initialX - source.initialX;
    const dirY = target.initialY - source.initialY;
    const dirLen = Math.hypot(dirX, dirY) || 1;
    const dirUnit = dirLen === 0 ? { x: 0, y: 0 } : { x: dirX / dirLen, y: dirY / dirLen };
    const normal = { x: -dirUnit.y, y: dirUnit.x };

    return points.map((p) => {
      const relX = p.x - source.initialX;
      const relY = p.y - source.initialY;
      const along = relX * dirUnit.x + relY * dirUnit.y;
      const offset = relX * normal.x + relY * normal.y;
      return {
        t: along / dirLen,
        offsetRatio: offset / dirLen,
      };
    });
  }

  /**
   * 将相对路径点投影到当前节点位置
   */
  function projectRelativePoint(
    relative: RelativePoint,
    source: NodeInfo,
    target: NodeInfo
  ): Point {
    const dirX = target.x - source.x;
    const dirY = target.y - source.y;
    const len = Math.hypot(dirX, dirY) || 1;
    const dirUnit = len === 0 ? { x: 0, y: 0 } : { x: dirX / len, y: dirY / len };
    const normal = { x: -dirUnit.y, y: dirUnit.x };
    const along = relative.t * len;
    const offset = relative.offsetRatio * len;

    return {
      x: source.x + along * dirUnit.x + offset * normal.x,
      y: source.y + along * dirUnit.y + offset * normal.y,
    };
  }

  /**
   * 取得更新后的路径点，优先复用 Mermaid 给出的 data-points 形态
   */
  function getUpdatedEdgePoints(edge: EdgeInfo, source: NodeInfo, target: NodeInfo): Point[] {
    if (edge.relativePoints?.length) {
      return edge.relativePoints.map((rel) => projectRelativePoint(rel, source, target));
    }

    if (edge.decodedPoints?.length) {
      edge.relativePoints = buildRelativePoints(edge.decodedPoints, source, target);
      return edge.relativePoints.map((rel) => projectRelativePoint(rel, source, target));
    }

    return calculateEdgePoints(source, target);
  }

  /**
   * 通过 Path 的真实长度获取标签中心，保持与曲线一致
   */
  function getLabelPositionFromPath(path: SVGPathElement, points: Point[]): Point {
    try {
      const length = path.getTotalLength();
      if (Number.isFinite(length) && length > 0) {
        const midPoint = path.getPointAtLength(length / 2);
        return { x: midPoint.x, y: midPoint.y };
      }
    } catch (error) {
      console.warn('[InteractiveCanvas] Failed to compute label position from path', error);
    }

    if (points.length > 0) {
      return calculateLabelPosition(points);
    }

    const box = path.getBBox();
    return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
  }

  /**
   * 找到应该移动的标签容器（优先 edgeLabel/label）
   */
  function getLabelContainer(label: SVGGElement | SVGTextElement | undefined): SVGGElement | SVGTextElement | undefined {
    if (!label) return undefined;
    let el: Element | null = label;
    while (el) {
      if (
        el instanceof SVGGElement &&
        (el.classList.contains('edgeLabel') || el.classList.contains('edge-label') || el.classList.contains('label'))
      ) {
        return el as SVGGElement;
      }
      el = el.parentElement;
    }
    return label;
  }

  /**
   * 创建随边移动的覆盖标签，避免依赖 Mermaid 的定位
   */
  function createOverlayLabel(path: SVGPathElement, text: string): SVGTextElement | null {
    const svg = path.ownerSVGElement;
    if (!svg) return null;

    const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    label.textContent = text;
    label.setAttribute('text-anchor', 'middle');
    label.setAttribute('dominant-baseline', 'central');
    label.setAttribute('class', 'interactive-edge-label');
    label.setAttribute('fill', '#333333');
    label.setAttribute('font-size', '12px');
    label.setAttribute('font-family', 'sans-serif');
    label.style.pointerEvents = 'none';

    // 挂到 SVG 顶层，便于统一 reposition
    svg.appendChild(label);
    return label;
  }

  /**
   * 通过 data-id 精确获取 Mermaid 生成的标签元素
   */
  function findLabelForEdge(edgeId: string, svg: SVGSVGElement): {
    labelElement?: SVGGElement | SVGTextElement;
    labelContainer?: SVGGElement | SVGTextElement;
  } {
    const labelEl = svg.querySelector(`[data-id="${edgeId}"]`) as
      | SVGGElement
      | SVGTextElement
      | null;

    if (!labelEl) {
      return {};
    }

    return {
      labelElement: labelEl,
      labelContainer: getLabelContainer(labelEl),
    };
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

    if (!sourceNode || !targetNode) {
      console.warn(`[updateEdgePath] Missing nodes for edge ${edge.id}: source=${edge.sourceId}, target=${edge.targetId}`);
      return;
    }

    // 计算新的路径点，尽可能保持 Mermaid 原有的曲线路径与偏移
    const points = getUpdatedEdgePoints(edge, sourceNode, targetNode);

    // 生成新的路径
    const pathD = generateCurvePath(points);

    edge.element.setAttribute('d', pathD);

    // 恢复所有边属性 - 这是关键！
    if (edge.markerStart) {
      edge.element.setAttribute('marker-start', edge.markerStart);
    } else {
      edge.element.removeAttribute('marker-start');
    }

    if (edge.markerEnd) {
      edge.element.setAttribute('marker-end', edge.markerEnd);
    } else {
      edge.element.removeAttribute('marker-end');
    }

    // 恢复CSS类
    if (edge.cssClasses) {
      edge.element.setAttribute('class', edge.cssClasses);
    }

    // 恢复边颜色
    if (edge.stroke) {
      edge.element.setAttribute('stroke', edge.stroke);
    }

    // 恢复边宽度
    if (edge.strokeWidth) {
      edge.element.setAttribute('stroke-width', edge.strokeWidth);
    }

    // 更新标签位置 - 使用类似 Mermaid 的算法
    const labelTarget = edge.labelContainer ?? edge.labelElement;
    if (!labelTarget) return;

    const labelPos = getLabelPositionFromPath(edge.element, points);
    labelTarget.setAttribute('transform', `translate(${labelPos.x}, ${labelPos.y})`);

    // 确保标签可见性
    labelTarget.style.display = 'block';
    labelTarget.style.visibility = 'visible';
  }

  /**
   * 计算边的路径点
   */
  function calculateEdgePoints(
    source: NodeInfo,
    target: NodeInfo
  ): Point[] {
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
  function generateCurvePath(points: Point[]): string {
    if (points.length < 2) return '';

    const lineGenerator = d3
      .line<Point>()
      .x((d) => d.x)
      .y((d) => d.y)
      .curve(d3.curveBasis);

    return lineGenerator(points) || '';
  }

  /**
   * 计算两点之间的距离
   */
  function distance(p1: Point, p2: Point | undefined): number {
    if (!p2) return 0;
    return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
  }

  /**
   * 沿着路径计算指定距离处的点
   */
  function calculatePoint(points: Point[], distanceToTraverse: number): Point {
    let prevPoint: Point | undefined = undefined;
    let remainingDistance = distanceToTraverse;

    for (const point of points) {
      if (prevPoint) {
        const vectorDistance = distance(point, prevPoint);
        if (vectorDistance === 0) {
          return prevPoint;
        }
        if (remainingDistance <= vectorDistance) {
          const ratio = remainingDistance / vectorDistance;
          return {
            x: prevPoint.x + (point.x - prevPoint.x) * ratio,
            y: prevPoint.y + (point.y - prevPoint.y) * ratio,
          };
        }
        remainingDistance -= vectorDistance;
      }
      prevPoint = point;
    }

    return prevPoint || points[0];
  }

  /**
   * 遍历边到中点
   */
  function traverseEdge(points: Point[]): Point {
    let prevPoint: Point | undefined = undefined;
    let totalDistance = 0;

    points.forEach((point) => {
      totalDistance += distance(point, prevPoint);
      prevPoint = point;
    });

    // 沿着点遍历总距离的一半
    const remainingDistance = totalDistance / 2;
    return calculatePoint(points, remainingDistance);
  }

  /**
   * 计算标签位置 - 基于 Mermaid 的算法
   */
  function calculateLabelPosition(points: Point[]): Point {
    if (points.length === 1) {
      return points[0];
    }
    return traverseEdge(points);
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

    // 初始更新 viewBox 以包含所有内容
    updateSvgViewBox();

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

    // Escape 取消选择
    if (event.key === 'Escape') {
      event.preventDefault();
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

    const viewBox = calculateDynamicViewBox();
    if (!viewBox) return;

    const containerRect = containerEl.getBoundingClientRect();
    const padding = 40;

    // 计算适合的缩放比例（基于动态计算的边界）
    const scaleX = (containerRect.width - padding * 2) / viewBox.width;
    const scaleY = (containerRect.height - padding * 2) / viewBox.height;
    scale = Math.min(scaleX, scaleY, 1);

    // 调整平移以居中内容
    translateX = (containerRect.width - viewBox.width * scale) / 2 - viewBox.minX * scale;
    translateY = (containerRect.height - viewBox.height * scale) / 2 - viewBox.minY * scale;
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

  /* svelte-ignore css_unused_selector */
  /* 画布占位符样式 */
  :global(.canvas-placeholder) {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100%;
    background: #fafafa;
    border: 2px dashed #ddd;
    border-radius: 8px;
    margin: 20px;
  }

  /* svelte-ignore css_unused_selector */
  :global(.placeholder-content) {
    text-align: center;
    max-width: 400px;
    padding: 40px;
  }

  /* svelte-ignore css_unused_selector */
  :global(.placeholder-icon) {
    font-size: 48px;
    margin-bottom: 16px;
    opacity: 0.6;
  }

  /* svelte-ignore css_unused_selector */
  :global(.placeholder-text h3) {
    margin: 0 0 8px 0;
    color: #666;
    font-size: 18px;
    font-weight: 600;
  }

  /* svelte-ignore css_unused_selector */
  :global(.placeholder-text p) {
    margin: 0;
    color: #999;
    font-size: 14px;
    line-height: 1.4;
  }
</style>
