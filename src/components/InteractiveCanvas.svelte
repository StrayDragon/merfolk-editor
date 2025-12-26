<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import mermaid from 'mermaid';
  import * as d3 from 'd3';
  import { MermaidParser } from '../core/parser/MermaidParser';
  import type { FlowEdge } from '../core/model/Edge';
  import { interactiveCanvasLogger as logger } from '../lib/logger';
  import { CANVAS_PADDING, MIN_LABEL_DISTANCE, MAX_LABEL_DISTANCE } from '../core/constants';
  import ContextMenu, { type MenuItem } from './ContextMenu.svelte';

  interface ContextMenuState {
    visible: boolean;
    x: number;
    y: number;
    nodeId: string | null;
  }

  import type { ShapeType } from '$core/model/types';

  interface Props {
    code: string;
    /** 只读模式（非 Flowchart 类型） */
    readonly?: boolean;
    /** Error callback (null = no error) */
    onError?: (error: string | null) => void;
    onNodeMove?: (nodeId: string, x: number, y: number) => void;
    onNodeSelect?: (nodeId: string | null) => void;
    /** 删除节点回调 */
    onDeleteNode?: (nodeId: string) => void;
    /** 添加节点回调 (支持指定形状) */
    onAddNode?: (x: number, y: number, shape?: ShapeType) => void;
    /** 编辑节点文本回调 */
    onEditNode?: (nodeId: string) => void;
    /** 添加边回调（打开对话框模式） */
    onAddEdge?: (sourceNodeId: string) => void;
    /** 拖拽创建边回调（直接创建模式） */
    onDragEdgeCreate?: (sourceId: string, targetId: string) => void;
    /** 删除边回调 */
    onDeleteEdge?: (edgeId: string, sourceId: string, targetId: string) => void;
    /** 编辑边回调 */
    onEditEdge?: (edgeId: string, sourceId: string, targetId: string, currentText?: string) => void;
    /** 在边上插入节点回调 */
    onInsertNodeOnEdge?: (sourceId: string, targetId: string, shape: ShapeType) => void;
    /** 画布编辑开始回调 */
    onEditStart?: () => void;
    /** 画布编辑结束回调 */
    onEditEnd?: () => void;
    /** 是否显示网格背景 */
    showGrid?: boolean;
    /** 最小缩放比例 */
    minScale?: number;
    /** 最大缩放比例 */
    maxScale?: number;
  }

  let {
    code,
    readonly = false,
    onError,
    onNodeMove,
    onNodeSelect,
    onDeleteNode,
    onAddNode,
    onEditNode,
    onAddEdge,
    onDragEdgeCreate,
    onDeleteEdge,
    onEditEdge,
    onInsertNodeOnEdge,
    onEditStart,
    onEditEnd,
    showGrid = true,
    minScale = 0.1,
    maxScale = 4
  }: Props = $props();

  // 右键菜单状态
  let contextMenu = $state<ContextMenuState>({
    visible: false,
    x: 0,
    y: 0,
    nodeId: null
  });

  let containerEl: HTMLDivElement;
  let svgContainerEl: HTMLDivElement;
  let renderCounter = 0;
  let selectedNodeId: string | null = $state(null);
  let selectedEdgeId: string | null = $state(null);

  // 多选支持
  let selectedNodeIds = $state<Set<string>>(new Set());

  // 框选状态
  let isBoxSelecting = $state(false);
  let boxSelectStart = $state<{ x: number; y: number } | null>(null);
  let boxSelectEnd = $state<{ x: number; y: number } | null>(null);

  // 拖拽连线状态
  interface DragEdgeState {
    isActive: boolean;
    sourceNodeId: string;
    sourcePoint: { x: number; y: number };
    currentPoint: { x: number; y: number };
    hoverTargetId: string | null;
  }
  let dragEdge = $state<DragEdgeState>({
    isActive: false,
    sourceNodeId: '',
    sourcePoint: { x: 0, y: 0 },
    currentPoint: { x: 0, y: 0 },
    hoverTargetId: null,
  });

  // 帮助面板状态
  let showHelpPanel = $state(false);

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
    labelContainer?: SVGGElement | SVGTextElement;
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

  // Track event listeners for cleanup
  const cleanupFunctions: (() => void)[] = [];

  // Cleanup all event listeners on component destroy
  onDestroy(() => {
    cleanupFunctions.forEach((cleanup) => cleanup());
    cleanupFunctions.length = 0;
  });

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

  // Re-render when code changes (with debounce)
  let renderTimeout: ReturnType<typeof setTimeout>;

  // 视图状态保持：记录是否是首次渲染
  let isFirstRender = true;
  // 上一次的代码，用于判断是否需要完全重渲染
  let lastRenderedCode = '';
  // 待聚焦的节点 ID（新添加的节点）
  let pendingFocusNodeId: string | null = null;

  $effect(() => {
    if (code && containerEl) {
      clearTimeout(renderTimeout);
      renderTimeout = setTimeout(() => {
        renderDiagram(code);
      }, 150);
    }
  });

  /**
   * 设置待聚焦的节点（用于新添加节点后自动滚动到该节点）
   */
  export function focusOnNode(nodeId: string): void {
    pendingFocusNodeId = nodeId;
  }

  async function renderDiagram(mermaidCode: string): Promise<void> {
    if (!svgContainerEl) return;

    const id = `mermaid-interactive-${++renderCounter}`;

    // 保存当前视图状态（仅在非首次渲染时）
    const savedViewState = !isFirstRender ? {
      scale,
      translateX,
      translateY,
      selectedNodeId,
      selectedNodeIds: new Set(selectedNodeIds),
    } : null;

    try {
      // 首先尝试解析代码
      await mermaid.parse(mermaidCode);

      // 解析成功，渲染图表
      const { svg } = await mermaid.render(id, mermaidCode);
      svgContainerEl.innerHTML = svg;

      // 设置交互（传递解析后的模型信息）
      setupInteraction(mermaidCode);

      // 视图状态恢复逻辑
      if (savedViewState && !isFirstRender) {
        // 恢复缩放和平移状态
        scale = savedViewState.scale;
        translateX = savedViewState.translateX;
        translateY = savedViewState.translateY;

        // 尝试恢复选择状态
        if (savedViewState.selectedNodeId && nodeInfoMap.has(savedViewState.selectedNodeId)) {
          selectedNodeId = savedViewState.selectedNodeId;
          selectedNodeIds = savedViewState.selectedNodeIds;
          // 重新应用选中样式
          for (const id of selectedNodeIds) {
            const nodeInfo = nodeInfoMap.get(id);
            if (nodeInfo) {
              nodeInfo.element.classList.add('selected');
            }
          }
        }

        // 如果有待聚焦的节点，滚动到该节点
        if (pendingFocusNodeId) {
          requestAnimationFrame(() => {
            scrollToNodeSmooth(pendingFocusNodeId!, true);
            selectNode(pendingFocusNodeId);
            pendingFocusNodeId = null;
          });
        }
      } else {
        // 首次渲染，执行默认的居中操作
        setupZoomPan();
        isFirstRender = false;
      }

      lastRenderedCode = mermaidCode;

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
   * 平滑滚动到指定节点
   * @param nodeId 节点 ID
   * @param highlight 是否高亮闪烁
   */
  function scrollToNodeSmooth(nodeId: string, highlight: boolean = false): void {
    const nodeInfo = nodeInfoMap.get(nodeId);
    if (!nodeInfo || !containerEl) return;

    const containerRect = containerEl.getBoundingClientRect();

    // 计算节点在当前缩放下的位置
    const nodeScreenX = nodeInfo.x * scale + translateX;
    const nodeScreenY = nodeInfo.y * scale + translateY;

    // 检查节点是否在视口内
    const padding = 100;
    const isInView =
      nodeScreenX >= padding &&
      nodeScreenX <= containerRect.width - padding &&
      nodeScreenY >= padding &&
      nodeScreenY <= containerRect.height - padding;

    // 如果节点不在视口内，平滑滚动到节点位置
    if (!isInView) {
      const targetTranslateX = containerRect.width / 2 - nodeInfo.x * scale;
      const targetTranslateY = containerRect.height / 2 - nodeInfo.y * scale;

      // 使用 CSS transition 实现平滑动画
      if (svgContainerEl) {
        svgContainerEl.style.transition = 'transform 0.3s ease-out';
        translateX = targetTranslateX;
        translateY = targetTranslateY;

        // 动画完成后移除 transition
        setTimeout(() => {
          if (svgContainerEl) {
            svgContainerEl.style.transition = '';
          }
        }, 300);
      }
    }

    // 高亮闪烁效果
    if (highlight) {
      highlightNode(nodeId);
    }
  }

  /**
   * 高亮闪烁节点
   */
  function highlightNode(nodeId: string): void {
    const nodeInfo = nodeInfoMap.get(nodeId);
    if (!nodeInfo) return;

    const element = nodeInfo.element;
    element.classList.add('node-highlight');

    // 闪烁动画
    setTimeout(() => {
      element.classList.remove('node-highlight');
    }, 1500);
  }

  // ============ 拖拽连线功能 ============

  /**
   * 开始拖拽连线
   */
  function startDragEdge(nodeId: string, startX: number, startY: number): void {
    // 只读模式下不允许创建边
    if (readonly) return;

    // 使用与覆盖层渲染一致的坐标计算
    const bounds = getNodeSvgBounds(nodeId);
    if (!bounds) return;

    // 从节点底部中心开始（与连接点位置一致）
    const sourceX = bounds.x + bounds.width / 2;
    const sourceY = bounds.y + bounds.height;

    dragEdge = {
      isActive: true,
      sourceNodeId: nodeId,
      sourcePoint: { x: sourceX, y: sourceY },
      currentPoint: { x: sourceX, y: sourceY }, // 初始位置也从起点开始
      hoverTargetId: null,
    };

    onEditStart?.();
  }

  /**
   * 将屏幕坐标转换为 SVG 内部坐标
   */
  function screenToSvgCoords(clientX: number, clientY: number): { x: number; y: number } | null {
    const svg = svgContainerEl?.querySelector('svg');
    if (!svg) return null;

    // 使用 SVG 的 getScreenCTM() 进行精确坐标转换
    const ctm = svg.getScreenCTM();
    if (!ctm) return null;

    const point = svg.createSVGPoint();
    point.x = clientX;
    point.y = clientY;

    // 将屏幕坐标转换为 SVG 坐标
    const svgPoint = point.matrixTransform(ctm.inverse());
    return { x: svgPoint.x, y: svgPoint.y };
  }

  /**
   * 更新拖拽连线位置
   */
  function updateDragEdge(clientX: number, clientY: number): void {
    if (!dragEdge.isActive) return;

    // 使用精确的 SVG 坐标转换
    const svgCoords = screenToSvgCoords(clientX, clientY);
    if (!svgCoords) return;

    dragEdge.currentPoint = { x: svgCoords.x, y: svgCoords.y };

    // 检测是否悬停在某个节点上
    let hoveredNodeId: string | null = null;
    for (const [id] of nodeInfoMap) {
      if (id === dragEdge.sourceNodeId) continue;

      // 使用与覆盖层渲染一致的坐标计算
      const bounds = getNodeSvgBounds(id);
      if (!bounds) continue;

      // 检查鼠标是否在节点范围内（增加容差提高易用性）
      const tolerance = 10;
      if (
        svgCoords.x >= bounds.x - tolerance &&
        svgCoords.x <= bounds.x + bounds.width + tolerance &&
        svgCoords.y >= bounds.y - tolerance &&
        svgCoords.y <= bounds.y + bounds.height + tolerance
      ) {
        hoveredNodeId = id;
        break;
      }
    }

    // 更新悬停目标并添加/移除高亮样式
    if (dragEdge.hoverTargetId !== hoveredNodeId) {
      // 移除旧的高亮
      if (dragEdge.hoverTargetId) {
        const oldTarget = nodeInfoMap.get(dragEdge.hoverTargetId);
        if (oldTarget) {
          oldTarget.element.classList.remove('drag-target');
        }
      }
      // 添加新的高亮
      if (hoveredNodeId) {
        const newTarget = nodeInfoMap.get(hoveredNodeId);
        if (newTarget) {
          newTarget.element.classList.add('drag-target');
        }
      }
    }

    dragEdge.hoverTargetId = hoveredNodeId;
  }

  /**
   * 结束拖拽连线
   */
  function endDragEdge(): void {
    if (!dragEdge.isActive) return;

    const targetId = dragEdge.hoverTargetId;
    const sourceId = dragEdge.sourceNodeId;

    // 清除目标高亮
    if (targetId) {
      const targetNode = nodeInfoMap.get(targetId);
      if (targetNode) {
        targetNode.element.classList.remove('drag-target');
      }
    }

    // 重置状态
    dragEdge = {
      isActive: false,
      sourceNodeId: '',
      sourcePoint: { x: 0, y: 0 },
      currentPoint: { x: 0, y: 0 },
      hoverTargetId: null,
    };

    // 如果有有效目标，创建边
    if (targetId && targetId !== sourceId) {
      onDragEdgeCreate?.(sourceId, targetId);
    }

    onEditEnd?.();
  }

  /**
   * 取消拖拽连线
   */
  function cancelDragEdge(): void {
    // 清除目标高亮
    if (dragEdge.hoverTargetId) {
      const targetNode = nodeInfoMap.get(dragEdge.hoverTargetId);
      if (targetNode) {
        targetNode.element.classList.remove('drag-target');
      }
    }

    dragEdge = {
      isActive: false,
      sourceNodeId: '',
      sourcePoint: { x: 0, y: 0 },
      currentPoint: { x: 0, y: 0 },
      hoverTargetId: null,
    };
    onEditEnd?.();
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

      // 禁用拖拽 - 只有点击选择
      // 点击选择（支持 Ctrl/Cmd 多选）
      nodeEl.addEventListener('click', (e) => {
        e.stopPropagation();
        const addToSelection = e.ctrlKey || e.metaKey;
        selectNode(nodeId, addToSelection);
      });

      // 双击编辑
      nodeEl.addEventListener('dblclick', (e) => {
        e.stopPropagation();
        onEditNode?.(nodeId);
      });

      // 添加视觉反馈 - 改为指针（不再支持拖拽）
      nodeEl.style.cursor = 'pointer';
    });

    // 解析代码获取边的结构信息
    let model;
    try {
      model = parser.parse(mermaidCode);
    } catch (e) {
      logger.warn('Failed to parse code for edge matching:', e);
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
          logger.warn(`Could not find path for edge ${edge.id}`);
          return;
        }

        usedPaths.add(pathCandidate.path);
        const directLabel = findLabelForEdge(edge.id, svg);
        const labelElement =
          directLabel.labelElement ??
          pickLabelForPath(pathCandidate.path, edgeLabelList, usedLabels);
        const overlayLabel = edge.text ? createOverlayLabel(pathCandidate.path, edge.text) : undefined;
        const labelContainer =
          overlayLabel
            ? getLabelContainer(overlayLabel)
            : directLabel.labelContainer ?? getLabelContainer(labelElement);
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
          labelContainer,
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
          const labelContainer = getLabelContainer(overlayLabel ?? pickedLabel ?? undefined);
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
            labelContainer,
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

    // 为边添加点击事件
    edgeInfoList.forEach((edgeInfo) => {
      const path = edgeInfo.element;
      path.style.cursor = 'pointer';
      // 增加点击区域
      path.style.strokeWidth = path.style.strokeWidth || '3';

      path.addEventListener('click', (e) => {
        e.stopPropagation();
        selectEdge(edgeInfo.id);
      });

      // 双击边编辑标签
      path.addEventListener('dblclick', (e) => {
        e.stopPropagation();
        onEditEdge?.(edgeInfo.id, edgeInfo.sourceId, edgeInfo.targetId, edgeInfo.labelText);
      });

      // 边的右键菜单
      path.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        e.stopPropagation();
        selectedEdgeId = edgeInfo.id;
        selectedNodeId = null;
        selectedNodeIds.clear();
        contextMenu = {
          visible: true,
          x: e.clientX,
          y: e.clientY,
          nodeId: null,
        };
      });
    });

    // 点击空白处取消选择
    svg.addEventListener('click', (e) => {
      const target = e.target as Element;
      // 如果点击的是节点或边，不取消选择（由各自的点击事件处理）
      if (target.closest('g.node') || target.closest('path.flowchart-link') || target.closest('.edgePath')) {
        return;
      }
      // 否则取消所有选择
      selectNode(null);
      selectEdge(null);
    });

  }

  /**
   * 选中/取消选中边
   */
  function selectEdge(edgeId: string | null): void {
    // 取消之前选中边的样式
    if (selectedEdgeId) {
      const prevEdge = edgeInfoList.find(e => e.id === selectedEdgeId);
      if (prevEdge) {
        prevEdge.element.classList.remove('edge-selected');
      }
    }

    selectedEdgeId = edgeId;

    // 选中边时取消节点选择
    if (edgeId) {
      selectedNodeId = null;
      selectedNodeIds.clear();

      const edge = edgeInfoList.find(e => e.id === edgeId);
      if (edge) {
        edge.element.classList.add('edge-selected');
      }
    }
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
    } catch (error) {
      logger.warn('Failed to find edge endpoints by geometry', error);
      return { sourceId: null, targetId: null };
    }
  }

  /**
   * 解码 Mermaid 存在 data-points 上的路径信息
   */
  function decodeEdgePoints(encoded: string | null): Point[] | undefined {
    if (!encoded || typeof atob !== 'function') return undefined;

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
      logger.warn('Failed to decode edge points', error);
    }

    return undefined;
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
        score = distance < MAX_LABEL_DISTANCE ? 1000 - distance : 0;
      } else {
        // 没有文本的标签，只有在距离很近时才选择
        score = distance < MIN_LABEL_DISTANCE ? 500 - distance : 0;
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
   * 更新节点位置（保留用于未来可能的拖拽功能）
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
    minX -= CANVAS_PADDING;
    minY -= CANVAS_PADDING;
    maxX += CANVAS_PADDING;
    maxY += CANVAS_PADDING;

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
      logger.warn('Failed to compute label position from path', error);
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
      logger.warn(`Missing nodes for edge ${edge.id}: source=${edge.sourceId}, target=${edge.targetId}`);
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
   * 选择节点（支持多选）
   */
  function selectNode(nodeId: string | null, addToSelection = false): void {
    // 只读模式下不允许选中
    if (readonly) return;

    if (addToSelection && nodeId) {
      // 多选模式：切换节点选中状态
      if (selectedNodeIds.has(nodeId)) {
        selectedNodeIds.delete(nodeId);
        const node = nodeInfoMap.get(nodeId);
        if (node) {
          node.element.classList.remove('selected');
        }
      } else {
        selectedNodeIds.add(nodeId);
        const node = nodeInfoMap.get(nodeId);
        if (node) {
          node.element.classList.add('selected');
        }
      }
      // 更新主选中节点
      selectedNodeId = selectedNodeIds.size > 0 ? Array.from(selectedNodeIds)[0] : null;
      // 触发新的 Set 引用以更新响应式
      selectedNodeIds = new Set(selectedNodeIds);
    } else {
      // 单选模式：清除所有选中，选中新节点
      clearAllSelections();

      selectedNodeId = nodeId;

      if (nodeId) {
        selectedNodeIds.add(nodeId);
        const node = nodeInfoMap.get(nodeId);
        if (node) {
          node.element.classList.add('selected');
        }
        selectedNodeIds = new Set(selectedNodeIds);
      }
    }

    onNodeSelect?.(selectedNodeId);
  }

  /**
   * 清除所有选中状态（包括节点和边）
   */
  function clearAllSelections(): void {
    // 清除节点选择
    for (const id of selectedNodeIds) {
      const node = nodeInfoMap.get(id);
      if (node) {
        node.element.classList.remove('selected');
      }
    }
    selectedNodeIds.clear();
    selectedNodeIds = new Set();

    // 清除边选择
    selectEdge(null);
  }

  /**
   * 选中多个节点（用于框选）
   */
  function selectMultipleNodes(nodeIds: string[]): void {
    clearAllSelections();
    for (const id of nodeIds) {
      selectedNodeIds.add(id);
      const node = nodeInfoMap.get(id);
      if (node) {
        node.element.classList.add('selected');
      }
    }
    selectedNodeId = nodeIds.length > 0 ? nodeIds[0] : null;
    selectedNodeIds = new Set(selectedNodeIds);
    onNodeSelect?.(selectedNodeId);
  }

  /**
   * 获取框选区域内的节点
   */
  function getNodesInSelectionBox(start: { x: number; y: number }, end: { x: number; y: number }): string[] {
    const minX = Math.min(start.x, end.x);
    const maxX = Math.max(start.x, end.x);
    const minY = Math.min(start.y, end.y);
    const maxY = Math.max(start.y, end.y);

    const result: string[] = [];
    for (const [id, info] of nodeInfoMap) {
      // 检查节点中心是否在框选区域内
      if (info.x >= minX && info.x <= maxX && info.y >= minY && info.y <= maxY) {
        result.push(id);
      }
    }
    return result;
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
    // 只有在空白处才开始平移或框选
    const target = event.target as Element;
    if (target.closest('g.node')) return;

    if (event.button !== 0) return;

    // Shift+拖拽开始框选
    if (event.shiftKey && containerEl) {
      isBoxSelecting = true;
      const rect = containerEl.getBoundingClientRect();
      const canvasX = (event.clientX - rect.left - translateX) / scale;
      const canvasY = (event.clientY - rect.top - translateY) / scale;
      boxSelectStart = { x: canvasX, y: canvasY };
      boxSelectEnd = { x: canvasX, y: canvasY };
      containerEl.style.cursor = 'crosshair';
      return;
    }

    isPanning = true;
    lastX = event.clientX;
    lastY = event.clientY;
    containerEl.style.cursor = 'grabbing';
  }

  function handleMouseMove(event: MouseEvent): void {
    // 拖拽连线模式
    if (dragEdge.isActive) {
      updateDragEdge(event.clientX, event.clientY);
      return;
    }

    // 框选模式
    if (isBoxSelecting && containerEl && boxSelectStart) {
      const rect = containerEl.getBoundingClientRect();
      const canvasX = (event.clientX - rect.left - translateX) / scale;
      const canvasY = (event.clientY - rect.top - translateY) / scale;
      boxSelectEnd = { x: canvasX, y: canvasY };
      return;
    }

    if (!isPanning) return;

    const dx = event.clientX - lastX;
    const dy = event.clientY - lastY;
    translateX += dx;
    translateY += dy;
    lastX = event.clientX;
    lastY = event.clientY;
  }

  function handleMouseUp(): void {
    // 拖拽连线结束
    if (dragEdge.isActive) {
      endDragEdge();
      return;
    }

    // 完成框选
    if (isBoxSelecting && boxSelectStart && boxSelectEnd) {
      const nodesInBox = getNodesInSelectionBox(boxSelectStart, boxSelectEnd);
      if (nodesInBox.length > 0) {
        selectMultipleNodes(nodesInBox);
      }
      isBoxSelecting = false;
      boxSelectStart = null;
      boxSelectEnd = null;
    }

    isPanning = false;
    if (containerEl) {
      containerEl.style.cursor = 'default';
    }
  }

  /**
   * 键盘事件处理
   */
  function handleKeyDown(event: KeyboardEvent): void {
    // Delete 或 Backspace 删除选中的节点或边
    if (event.key === 'Delete' || event.key === 'Backspace') {
      event.preventDefault();

      // 优先删除选中的边
      if (selectedEdgeId) {
        const edge = edgeInfoList.find(e => e.id === selectedEdgeId);
        if (edge) {
          onDeleteEdge?.(edge.id, edge.sourceId, edge.targetId);
        }
        selectEdge(null);
        return;
      }

      // 删除选中的节点（支持批量删除）
      if (selectedNodeIds.size > 0) {
        const nodesToDelete = Array.from(selectedNodeIds);
        for (const nodeId of nodesToDelete) {
          onDeleteNode?.(nodeId);
        }
        clearAllSelections();
        selectedNodeId = null;
        onNodeSelect?.(null);
      }
    }

    // Escape 取消选择
    if (event.key === 'Escape') {
      event.preventDefault();

      // 取消拖拽连线
      if (dragEdge.isActive) {
        cancelDragEdge();
        return;
      }

      if (selectedNodeIds.size > 0) {
        clearAllSelections();
        selectedNodeId = null;
        onNodeSelect?.(null);
      }
      // 取消框选
      if (isBoxSelecting) {
        isBoxSelecting = false;
        boxSelectStart = null;
        boxSelectEnd = null;
      }
    }

    // Ctrl/Cmd + A 全选
    if ((event.ctrlKey || event.metaKey) && event.key === 'a') {
      event.preventDefault();
      const allNodeIds = Array.from(nodeInfoMap.keys());
      selectMultipleNodes(allNodeIds);
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

  /**
   * 获取节点在 SVG 坐标系中的边界
   * 用于在 SVG 内部渲染覆盖层
   */
  function getNodeSvgBounds(nodeId: string): { x: number; y: number; width: number; height: number } | null {
    const nodeInfo = nodeInfoMap.get(nodeId);
    if (!nodeInfo) return null;

    // 获取节点的 bounding box（本地坐标系）
    const bbox = nodeInfo.element.getBBox();

    // 计算全局坐标：transform 位移 + 本地坐标偏移
    return {
      x: nodeInfo.x + bbox.x,
      y: nodeInfo.y + bbox.y,
      width: bbox.width,
      height: bbox.height,
    };
  }

  /**
   * 获取选中节点的边界信息（SVG 坐标系）
   * 用于在 SVG 内部渲染覆盖层
   */
  function getSelectedNodeSvgBounds(): { x: number; y: number; width: number; height: number } | null {
    if (!selectedNodeId) return null;
    return getNodeSvgBounds(selectedNodeId);
  }

  // 响应式获取选中节点边界（SVG 坐标）
  const selectedNodeSvgBounds = $derived.by(() => {
    if (!selectedNodeId) return null;
    return getSelectedNodeSvgBounds();
  });

  /**
   * 在 SVG 内部渲染选择覆盖层
   */
  function updateSvgOverlay(): void {
    const svg = svgContainerEl?.querySelector('svg');
    if (!svg) return;

    // 移除旧的覆盖层
    const existingOverlay = svg.querySelector('.node-overlay-group');
    if (existingOverlay) {
      existingOverlay.remove();
    }

    // 如果没有选中节点或多选，不显示覆盖层
    if (!selectedNodeId || selectedNodeIds.size !== 1) return;

    const bounds = getSelectedNodeSvgBounds();
    if (!bounds) return;

    // 创建覆盖层 SVG 组
    const overlayGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    overlayGroup.setAttribute('class', 'node-overlay-group');

    // 选择框
    const selectionRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    selectionRect.setAttribute('x', String(bounds.x - 2));
    selectionRect.setAttribute('y', String(bounds.y - 2));
    selectionRect.setAttribute('width', String(bounds.width + 4));
    selectionRect.setAttribute('height', String(bounds.height + 4));
    selectionRect.setAttribute('fill', 'none');
    selectionRect.setAttribute('stroke', '#0d6efd');
    selectionRect.setAttribute('stroke-width', '2');
    selectionRect.setAttribute('rx', '2');
    selectionRect.style.pointerEvents = 'none';
    overlayGroup.appendChild(selectionRect);

    // 底部连接点
    const portGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    const portX = bounds.x + bounds.width / 2;
    const portY = bounds.y + bounds.height;
    portGroup.setAttribute('transform', `translate(${portX}, ${portY})`);
    portGroup.style.cursor = 'pointer';

    // 连接点背景圆
    const portCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    portCircle.setAttribute('r', '10');
    portCircle.setAttribute('fill', 'white');
    portCircle.setAttribute('stroke', '#0d6efd');
    portCircle.setAttribute('stroke-width', '2');
    portGroup.appendChild(portCircle);

    // 加号横线
    const hLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    hLine.setAttribute('x1', '-5');
    hLine.setAttribute('y1', '0');
    hLine.setAttribute('x2', '5');
    hLine.setAttribute('y2', '0');
    hLine.setAttribute('stroke', '#0d6efd');
    hLine.setAttribute('stroke-width', '2');
    hLine.setAttribute('stroke-linecap', 'round');
    portGroup.appendChild(hLine);

    // 加号竖线
    const vLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    vLine.setAttribute('x1', '0');
    vLine.setAttribute('y1', '-5');
    vLine.setAttribute('x2', '0');
    vLine.setAttribute('y2', '5');
    vLine.setAttribute('stroke', '#0d6efd');
    vLine.setAttribute('stroke-width', '2');
    vLine.setAttribute('stroke-linecap', 'round');
    portGroup.appendChild(vLine);

    // 连接点点击事件（打开对话框模式）
    portGroup.addEventListener('click', (e) => {
      e.stopPropagation();
      if (selectedNodeId) {
        onAddEdge?.(selectedNodeId);
      }
    });

    // 连接点拖拽事件（拖拽连线模式）
    // 将 nodeId 存储在 data 属性中，避免闭包问题
    portGroup.setAttribute('data-node-id', selectedNodeId);
    portGroup.addEventListener('mousedown', (e) => {
      const nodeId = portGroup.getAttribute('data-node-id');
      e.stopPropagation();
      e.preventDefault();
      if (nodeId && containerEl) {
        const rect = containerEl.getBoundingClientRect();
        const canvasX = (e.clientX - rect.left - translateX) / scale;
        const canvasY = (e.clientY - rect.top - translateY) / scale;
        startDragEdge(nodeId, canvasX, canvasY);
      }
    });

    // Hover 效果
    portGroup.addEventListener('mouseenter', () => {
      portCircle.setAttribute('r', '12');
    });
    portGroup.addEventListener('mouseleave', () => {
      if (!dragEdge.isActive) {
        portCircle.setAttribute('r', '10');
      }
    });

    overlayGroup.appendChild(portGroup);
    svg.appendChild(overlayGroup);
  }

  /**
   * 在 SVG 内部渲染拖拽连线
   */
  function updateDragEdgeOverlay(): void {
    const svg = svgContainerEl?.querySelector('svg');
    if (!svg) return;

    // 移除旧的拖拽连线覆盖层
    const existingDragOverlay = svg.querySelector('.drag-edge-group');
    if (existingDragOverlay) {
      existingDragOverlay.remove();
    }

    // 如果没有激活拖拽，不渲染
    if (!dragEdge.isActive) return;

    const sourceNodeId = dragEdge.sourceNodeId;
    const bounds = getNodeSvgBounds(sourceNodeId);
    if (!bounds) return;

    // 起始点：节点底部中心（与连接点位置一致）
    const startX = bounds.x + bounds.width / 2;
    const startY = bounds.y + bounds.height;

    // 终点：当前鼠标位置（已转换为 SVG 坐标）
    const endX = dragEdge.currentPoint.x;
    const endY = dragEdge.currentPoint.y;

    // 创建拖拽连线组
    const dragGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    dragGroup.setAttribute('class', 'drag-edge-group');

    // 定义箭头标记
    const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
    const marker = document.createElementNS('http://www.w3.org/2000/svg', 'marker');
    marker.setAttribute('id', 'drag-arrow-svg');
    marker.setAttribute('markerWidth', '10');
    marker.setAttribute('markerHeight', '10');
    marker.setAttribute('refX', '9');
    marker.setAttribute('refY', '3');
    marker.setAttribute('orient', 'auto');
    marker.setAttribute('markerUnits', 'strokeWidth');
    const arrowPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    arrowPath.setAttribute('d', 'M0,0 L0,6 L9,3 z');
    arrowPath.setAttribute('fill', dragEdge.hoverTargetId ? '#4caf50' : '#1976d2');
    marker.appendChild(arrowPath);
    defs.appendChild(marker);
    dragGroup.appendChild(defs);

    // 连线
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', String(startX));
    line.setAttribute('y1', String(startY));
    line.setAttribute('x2', String(endX));
    line.setAttribute('y2', String(endY));
    line.setAttribute('stroke', dragEdge.hoverTargetId ? '#4caf50' : '#1976d2');
    line.setAttribute('stroke-width', '2');
    line.setAttribute('stroke-dasharray', '6,4');
    line.setAttribute('marker-end', 'url(#drag-arrow-svg)');
    line.style.pointerEvents = 'none';
    dragGroup.appendChild(line);

    // 起始点圆
    const startCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    startCircle.setAttribute('cx', String(startX));
    startCircle.setAttribute('cy', String(startY));
    startCircle.setAttribute('r', '4');
    startCircle.setAttribute('fill', '#1976d2');
    startCircle.style.pointerEvents = 'none';
    dragGroup.appendChild(startCircle);

    // 终点指示器
    if (dragEdge.hoverTargetId) {
      // 悬停在目标上时的动画效果
      const pulseCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      pulseCircle.setAttribute('cx', String(endX));
      pulseCircle.setAttribute('cy', String(endY));
      pulseCircle.setAttribute('r', '8');
      pulseCircle.setAttribute('fill', 'none');
      pulseCircle.setAttribute('stroke', '#4caf50');
      pulseCircle.setAttribute('stroke-width', '2');
      pulseCircle.style.pointerEvents = 'none';

      const animate1 = document.createElementNS('http://www.w3.org/2000/svg', 'animate');
      animate1.setAttribute('attributeName', 'r');
      animate1.setAttribute('from', '8');
      animate1.setAttribute('to', '14');
      animate1.setAttribute('dur', '0.6s');
      animate1.setAttribute('repeatCount', 'indefinite');
      pulseCircle.appendChild(animate1);

      const animate2 = document.createElementNS('http://www.w3.org/2000/svg', 'animate');
      animate2.setAttribute('attributeName', 'opacity');
      animate2.setAttribute('from', '1');
      animate2.setAttribute('to', '0');
      animate2.setAttribute('dur', '0.6s');
      animate2.setAttribute('repeatCount', 'indefinite');
      pulseCircle.appendChild(animate2);

      dragGroup.appendChild(pulseCircle);

      const endCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      endCircle.setAttribute('cx', String(endX));
      endCircle.setAttribute('cy', String(endY));
      endCircle.setAttribute('r', '6');
      endCircle.setAttribute('fill', '#4caf50');
      endCircle.style.pointerEvents = 'none';
      dragGroup.appendChild(endCircle);
    } else {
      const endCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      endCircle.setAttribute('cx', String(endX));
      endCircle.setAttribute('cy', String(endY));
      endCircle.setAttribute('r', '5');
      endCircle.setAttribute('fill', 'none');
      endCircle.setAttribute('stroke', '#1976d2');
      endCircle.setAttribute('stroke-width', '2');
      endCircle.setAttribute('stroke-dasharray', '3,2');
      endCircle.style.pointerEvents = 'none';
      dragGroup.appendChild(endCircle);
    }

    svg.appendChild(dragGroup);
  }

  // 响应式更新 SVG 覆盖层
  $effect(() => {
    // 依赖选中状态
    void selectedNodeId;
    void selectedNodeIds.size;
    updateSvgOverlay();
  });

  // 响应式更新拖拽连线
  $effect(() => {
    // 依赖拖拽状态
    void dragEdge.isActive;
    void dragEdge.currentPoint;
    void dragEdge.hoverTargetId;
    updateDragEdgeOverlay();
  });

  /**
   * 获取选中节点的屏幕坐标（用于工具栏定位）
   */
  function getSelectedNodeScreenBounds(): { x: number; y: number; width: number; height: number } | null {
    if (!selectedNodeId || !containerEl) return null;
    const nodeInfo = nodeInfoMap.get(selectedNodeId);
    if (!nodeInfo) return null;

    // 使用 getBoundingClientRect 获取节点在视口中的精确位置
    const nodeRect = nodeInfo.element.getBoundingClientRect();
    const containerRect = containerEl.getBoundingClientRect();

    // 计算相对于容器的坐标
    return {
      x: nodeRect.left - containerRect.left,
      y: nodeRect.top - containerRect.top,
      width: nodeRect.width,
      height: nodeRect.height,
    };
  }

  /**
   * 获取选中边的屏幕坐标（用于工具栏定位）
   * 返回边中点的位置
   */
  function getSelectedEdgeScreenPosition(): { x: number; y: number; edge: EdgeInfo } | null {
    if (!selectedEdgeId || !containerEl) return null;
    const edge = edgeInfoList.find(e => e.id === selectedEdgeId);
    if (!edge) return null;

    // 使用 getBoundingClientRect 获取边在视口中的位置
    const edgeRect = edge.element.getBoundingClientRect();
    const containerRect = containerEl.getBoundingClientRect();

    // 计算边的中点位置
    return {
      x: edgeRect.left - containerRect.left + edgeRect.width / 2,
      y: edgeRect.top - containerRect.top + edgeRect.height / 2,
      edge,
    };
  }

  /**
   * 处理边工具栏的编辑按钮
   */
  function handleEdgeToolbarEdit(): void {
    if (!selectedEdgeId) return;
    const edge = edgeInfoList.find(e => e.id === selectedEdgeId);
    if (edge) {
      onEditEdge?.(edge.id, edge.sourceId, edge.targetId, edge.labelText);
    }
  }

  /**
   * 处理边工具栏的删除按钮
   */
  function handleEdgeToolbarDelete(): void {
    if (!selectedEdgeId) return;
    const edge = edgeInfoList.find(e => e.id === selectedEdgeId);
    if (edge) {
      onDeleteEdge?.(edge.id, edge.sourceId, edge.targetId);
      selectEdge(null);
    }
  }

  /**
   * 在边上插入节点（常用形状快捷方式）
   */
  function handleInsertNodeOnEdge(shape: ShapeType): void {
    if (!selectedEdgeId) return;
    const edge = edgeInfoList.find(e => e.id === selectedEdgeId);
    if (edge) {
      onEditStart?.();
      onInsertNodeOnEdge?.(edge.sourceId, edge.targetId, shape);
      selectEdge(null);
      onEditEnd?.();
    }
  }

  // 快速插入节点的形状选项（使用 SVG path）
  const quickInsertShapes: { shape: ShapeType; svg: string; label: string }[] = [
    {
      shape: 'rect',
      svg: '<rect x="2" y="4" width="12" height="8" rx="0" fill="none" stroke="currentColor" stroke-width="1.5"/>',
      label: '矩形'
    },
    {
      shape: 'rounded',
      svg: '<rect x="2" y="4" width="12" height="8" rx="2" fill="none" stroke="currentColor" stroke-width="1.5"/>',
      label: '圆角'
    },
    {
      shape: 'diamond',
      svg: '<path d="M8 2 L14 8 L8 14 L2 8 Z" fill="none" stroke="currentColor" stroke-width="1.5"/>',
      label: '菱形'
    },
    {
      shape: 'circle',
      svg: '<circle cx="8" cy="8" r="6" fill="none" stroke="currentColor" stroke-width="1.5"/>',
      label: '圆形'
    },
  ];

  /**
   * 右键菜单处理
   */
  function handleContextMenu(event: MouseEvent): void {
    event.preventDefault();

    // 只读模式下不显示右键菜单
    if (readonly) return;

    // 获取点击的目标元素
    const target = event.target as Element;
    const nodeEl = target.closest('g.node') as SVGGElement | null;

    if (nodeEl) {
      // 在节点上右键点击
      const nodeId = extractNodeId(nodeEl);
      if (nodeId) {
        selectNode(nodeId);
        contextMenu = {
          visible: true,
          x: event.clientX,
          y: event.clientY,
          nodeId
        };
      }
    } else {
      // 在空白区域右键点击
      contextMenu = {
        visible: true,
        x: event.clientX,
        y: event.clientY,
        nodeId: null
      };
    }

    // 通知编辑开始
    onEditStart?.();
  }

  function closeContextMenu(): void {
    contextMenu = { ...contextMenu, visible: false };
  }

  function getContextMenuItems(): MenuItem[] {
    if (contextMenu.nodeId) {
      // 节点上的菜单
      return [
        { id: 'edit', label: '编辑节点', shortcut: 'E' },
        { id: 'add-edge', label: '添加连接' },
        { id: 'separator1', label: '', separator: true },
        { id: 'delete', label: '删除节点', shortcut: 'Del', danger: true }
      ];
    } else if (selectedEdgeId) {
      // 边上的菜单
      return [
        { id: 'edit-edge', label: '编辑边文本', shortcut: 'E' },
        { id: 'separator1', label: '', separator: true },
        { id: 'delete-edge', label: '删除边', shortcut: 'Del', danger: true }
      ];
    } else {
      // 空白区域的菜单 - 支持二级菜单选择节点形状
      return [
        {
          id: 'add-node',
          label: '添加节点',
          children: [
            { id: 'add-node-rect', label: '矩形' },
            { id: 'add-node-rounded', label: '圆角矩形' },
            { id: 'add-node-stadium', label: '胶囊形' },
            { id: 'add-node-circle', label: '圆形' },
            { id: 'add-node-diamond', label: '菱形' },
            { id: 'add-node-hexagon', label: '六边形' },
          ]
        },
        { id: 'separator1', label: '', separator: true },
        { id: 'fit-view', label: '适应视图' },
        { id: 'reset-zoom', label: '重置缩放' }
      ];
    }
  }

  function handleContextMenuSelect(itemId: string): void {
    // 解析添加节点的形状
    const addNodeMatch = itemId.match(/^add-node-(\w+)$/);
    if (addNodeMatch) {
      const shape = addNodeMatch[1] as ShapeType;
      if (containerEl) {
        const rect = containerEl.getBoundingClientRect();
        const canvasX = (contextMenu.x - rect.left - translateX) / scale;
        const canvasY = (contextMenu.y - rect.top - translateY) / scale;
        onAddNode?.(canvasX, canvasY, shape);
      }
      onEditEnd?.();
      closeContextMenu();
      return;
    }

    switch (itemId) {
      case 'edit':
        if (contextMenu.nodeId) {
          onEditNode?.(contextMenu.nodeId);
        }
        break;
      case 'add-edge':
        if (contextMenu.nodeId) {
          onAddEdge?.(contextMenu.nodeId);
        }
        break;
      case 'delete':
        if (contextMenu.nodeId) {
          onDeleteNode?.(contextMenu.nodeId);
          if (selectedNodeId === contextMenu.nodeId) {
            selectedNodeId = null;
          }
        }
        break;
      case 'edit-edge':
        if (selectedEdgeId) {
          const edge = edgeInfoList.find(e => e.id === selectedEdgeId);
          if (edge) {
            onEditEdge?.(edge.id, edge.sourceId, edge.targetId, edge.labelText);
          }
        }
        break;
      case 'delete-edge':
        if (selectedEdgeId) {
          const edge = edgeInfoList.find(e => e.id === selectedEdgeId);
          if (edge) {
            onDeleteEdge?.(edge.id, edge.sourceId, edge.targetId);
          }
          selectEdge(null);
        }
        break;
      case 'add-node':
        // 默认添加矩形节点
        if (containerEl) {
          const rect = containerEl.getBoundingClientRect();
          const canvasX = (contextMenu.x - rect.left - translateX) / scale;
          const canvasY = (contextMenu.y - rect.top - translateY) / scale;
          onAddNode?.(canvasX, canvasY, 'rect');
        }
        break;
      case 'fit-view':
        fitToView();
        break;
      case 'reset-zoom':
        resetZoom();
        break;
    }

    // 通知编辑结束
    onEditEnd?.();
    closeContextMenu();
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
  oncontextmenu={handleContextMenu}
  onkeydown={handleKeyDown}
  role="application"
  aria-label="Interactive Mermaid diagram"
  tabindex="0"
>
  <div class="svg-container" bind:this={svgContainerEl}></div>

  <!-- 缩放指示器 -->
  <div class="zoom-indicator">{Math.round(scale * 100)}%</div>

  <!-- 快捷键帮助按钮 -->
  <button
    class="help-button"
    onclick={() => showHelpPanel = !showHelpPanel}
    title="快捷键帮助"
  >
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
      <circle cx="12" cy="12" r="10"/>
      <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/>
      <line x1="12" y1="17" x2="12.01" y2="17"/>
    </svg>
  </button>

  <!-- 快捷键帮助面板 -->
  {#if showHelpPanel}
    <div class="help-panel">
      <div class="help-panel-header">
        <span>⌨️ {readonly ? '视图操作' : '快捷操作'}</span>
        <button class="help-close" onclick={() => showHelpPanel = false}>×</button>
      </div>
      <div class="help-panel-content">
        {#if !readonly}
          <div class="help-section">
            <h4>节点操作</h4>
            <div class="help-item"><kbd>右键空白</kbd> 添加节点</div>
            <div class="help-item"><kbd>双击节点</kbd> 编辑文本</div>
            <div class="help-item"><kbd>Delete</kbd> 删除选中</div>
            <div class="help-item"><kbd>Ctrl+A</kbd> 全选节点</div>
          </div>
          <div class="help-section">
            <h4>连线操作</h4>
            <div class="help-item"><kbd>拖拽端口</kbd> 快速连线</div>
            <div class="help-item"><kbd>点击端口</kbd> 打开连线对话框</div>
            <div class="help-item"><kbd>双击边</kbd> 编辑标签</div>
          </div>
        {/if}
        <div class="help-section">
          <h4>视图操作</h4>
          <div class="help-item"><kbd>滚轮</kbd> 缩放</div>
          <div class="help-item"><kbd>拖拽空白</kbd> 平移画布</div>
          {#if !readonly}
            <div class="help-item"><kbd>Shift+拖拽</kbd> 框选多个</div>
            <div class="help-item"><kbd>Escape</kbd> 取消选择</div>
          {/if}
        </div>
        {#if !readonly}
          <div class="help-section">
            <h4>撤销/重做</h4>
            <div class="help-item"><kbd>Ctrl+Z</kbd> 撤销</div>
            <div class="help-item"><kbd>Ctrl+Y</kbd> 重做</div>
          </div>
        {/if}
        {#if readonly}
          <div class="help-section readonly-hint">
            <div class="help-item">当前图类型为预览模式</div>
            <div class="help-item">请使用代码面板编辑</div>
          </div>
        {/if}
      </div>
    </div>
  {/if}

  <!-- 多选提示 -->
  {#if selectedNodeIds.size > 1}
    <div class="multi-select-indicator">
      已选中 {selectedNodeIds.size} 个节点
    </div>
  {/if}

  <!-- 框选矩形 -->
  {#if isBoxSelecting && boxSelectStart && boxSelectEnd}
    {@const left = Math.min(boxSelectStart.x, boxSelectEnd.x) * scale + translateX}
    {@const top = Math.min(boxSelectStart.y, boxSelectEnd.y) * scale + translateY}
    {@const width = Math.abs(boxSelectEnd.x - boxSelectStart.x) * scale}
    {@const height = Math.abs(boxSelectEnd.y - boxSelectStart.y) * scale}
    <div
      class="selection-box"
      style="left: {left}px; top: {top}px; width: {width}px; height: {height}px;"
    ></div>
  {/if}

  <!-- 拖拽连线提示 (连线本身在 SVG 内部渲染) -->
  {#if dragEdge.isActive}
    {@const endX = dragEdge.currentPoint.x * scale + translateX}
    {@const endY = dragEdge.currentPoint.y * scale + translateY}
    <div class="drag-edge-hint" style="left: {endX + 15}px; top: {endY - 10}px;">
      {#if dragEdge.hoverTargetId}
        <span class="hint-success">释放以连接</span>
      {:else}
        <span class="hint-info">拖拽到目标节点</span>
      {/if}
    </div>
  {/if}

  <!-- 节点选中时的浮动工具栏 (HTML 元素) -->
  {#if selectedNodeId && selectedNodeIds.size === 1}
    {@const bounds = getSelectedNodeScreenBounds()}
    {#if bounds}
      <div
        class="node-toolbar"
        style="left: {bounds.x + bounds.width / 2}px; top: {bounds.y - 8}px;"
      >
        <button onclick={() => selectedNodeId && onEditNode?.(selectedNodeId)} title="编辑 (双击)">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
          </svg>
        </button>
        <button onclick={() => selectedNodeId && onDeleteNode?.(selectedNodeId)} title="删除 (Del)" class="danger">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="3 6 5 6 21 6"/>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
          </svg>
        </button>
      </div>
    {/if}
  {/if}

  <!-- 边选中时的浮动工具栏 -->
  {#if selectedEdgeId}
    {@const edgePos = getSelectedEdgeScreenPosition()}
    {#if edgePos}
      <div
        class="edge-toolbar-container"
        style="left: {edgePos.x}px; top: {edgePos.y}px;"
      >
        <!-- 上方：编辑和删除按钮 -->
        <div class="edge-toolbar">
          <button onclick={handleEdgeToolbarEdit} title="编辑文本 (双击)">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
          </button>
          <button onclick={handleEdgeToolbarDelete} title="删除 (Del)" class="danger">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="3 6 5 6 21 6"/>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
            </svg>
          </button>
          {#if edgePos.edge.labelText}
            <span class="edge-label-preview" title={edgePos.edge.labelText}>
              "{edgePos.edge.labelText}"
            </span>
          {/if}
        </div>
        <!-- 下方：快速插入节点按钮 -->
        <div class="quick-insert-bar">
          <span class="quick-insert-label">插入:</span>
          {#each quickInsertShapes as { shape, svg, label }}
            <button
              class="quick-insert-btn"
              onclick={() => handleInsertNodeOnEdge(shape)}
              title={`在此插入${label}节点`}
            >
              <svg viewBox="0 0 16 16" width="14" height="14">
                {@html svg}
              </svg>
            </button>
          {/each}
        </div>
      </div>
    {/if}
  {/if}
</div>

<!-- 右键菜单 -->
{#if contextMenu.visible}
  <ContextMenu
    x={contextMenu.x}
    y={contextMenu.y}
    items={getContextMenuItems()}
    onSelect={handleContextMenuSelect}
    onClose={closeContextMenu}
  />
{/if}

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

  /* 拖拽连线提示 */
  .drag-edge-hint {
    position: absolute;
    padding: 4px 8px;
    border-radius: 4px;
    font-size: 12px;
    font-weight: 500;
    white-space: nowrap;
    pointer-events: none;
    z-index: 51;
    animation: fadeIn 0.15s ease;
  }

  .drag-edge-hint .hint-success {
    background: #e8f5e9;
    color: #2e7d32;
    padding: 4px 8px;
    border-radius: 4px;
    border: 1px solid #81c784;
  }

  .drag-edge-hint .hint-info {
    background: #e3f2fd;
    color: #1565c0;
    padding: 4px 8px;
    border-radius: 4px;
    border: 1px solid #64b5f6;
  }

  /* 多选指示器 */
  .multi-select-indicator {
    position: absolute;
    bottom: 12px;
    left: 12px;
    padding: 6px 12px;
    background: #1976d2;
    color: white;
    font-size: 12px;
    font-weight: 500;
    border-radius: 4px;
    pointer-events: none;
    user-select: none;
    animation: fadeIn 0.2s ease;
  }

  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(4px); }
    to { opacity: 1; transform: translateY(0); }
  }

  /* 帮助按钮 */
  .help-button {
    position: absolute;
    bottom: 12px;
    left: 12px;
    width: 32px;
    height: 32px;
    border: 1px solid #ddd;
    border-radius: 50%;
    background: white;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    color: #666;
    transition: all 0.2s;
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
    z-index: 10;
  }

  .help-button:hover {
    background: #f5f5f5;
    color: #1976d2;
    border-color: #1976d2;
  }

  /* 帮助面板 */
  .help-panel {
    position: absolute;
    bottom: 52px;
    left: 12px;
    width: 260px;
    background: white;
    border-radius: 8px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
    z-index: 100;
    animation: slideUp 0.2s ease;
    overflow: hidden;
  }

  @keyframes slideUp {
    from { opacity: 0; transform: translateY(8px); }
    to { opacity: 1; transform: translateY(0); }
  }

  .help-panel-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 16px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    font-weight: 600;
    font-size: 14px;
  }

  .help-close {
    background: none;
    border: none;
    color: white;
    font-size: 18px;
    cursor: pointer;
    opacity: 0.8;
    padding: 0;
    width: 20px;
    height: 20px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    transition: all 0.2s;
  }

  .help-close:hover {
    opacity: 1;
    background: rgba(255, 255, 255, 0.2);
  }

  .help-panel-content {
    padding: 12px 16px;
    max-height: 320px;
    overflow-y: auto;
  }

  .help-section {
    margin-bottom: 12px;
  }

  .help-section:last-child {
    margin-bottom: 0;
  }

  .help-section h4 {
    margin: 0 0 8px 0;
    font-size: 11px;
    font-weight: 600;
    color: #888;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .help-item {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 13px;
    color: #333;
    padding: 4px 0;
  }

  .help-item kbd {
    background: linear-gradient(180deg, #fafafa 0%, #f0f0f0 100%);
    border: 1px solid #ccc;
    border-bottom-width: 2px;
    border-radius: 4px;
    padding: 2px 6px;
    font-size: 11px;
    font-family: system-ui, -apple-system, sans-serif;
    color: #444;
    white-space: nowrap;
    min-width: 80px;
    text-align: center;
  }

  /* 只读模式提示 */
  .help-section.readonly-hint {
    background: linear-gradient(135deg, #667eea20 0%, #764ba220 100%);
    border-radius: 6px;
    padding: 12px;
    margin-top: 8px;
  }

  .help-section.readonly-hint .help-item {
    color: #667eea;
    font-weight: 500;
    justify-content: center;
  }

  /* 框选矩形 */
  .selection-box {
    position: absolute;
    border: 2px dashed #1976d2;
    background: rgba(25, 118, 210, 0.1);
    pointer-events: none;
    z-index: 100;
  }

  /* 节点浮动工具栏 */
  .node-toolbar {
    position: absolute;
    transform: translate(-50%, -100%);
    display: flex;
    gap: 1px;
    padding: 3px;
    background: #fff;
    border: 1px solid #dee2e6;
    border-radius: 6px;
    box-shadow: 0 2px 8px rgba(0,0,0,0.12);
    z-index: 30;
  }

  .node-toolbar button {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 26px;
    height: 26px;
    padding: 0;
    border: none;
    border-radius: 4px;
    background: transparent;
    color: #495057;
    cursor: pointer;
  }

  .node-toolbar button:hover {
    background: #f1f3f4;
  }

  .node-toolbar button.danger:hover {
    background: #fff5f5;
    color: #dc3545;
  }

  /* 边选中时的浮动工具栏容器 */
  .edge-toolbar-container {
    position: absolute;
    transform: translate(-50%, -50%);
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    z-index: 30;
    animation: fadeIn 0.15s ease;
  }

  /* 边选中时的浮动工具栏 */
  .edge-toolbar {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 8px 12px;
    background: linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%);
    border: 1px solid #90caf9;
    border-radius: 10px;
    box-shadow: 0 4px 16px rgba(25, 118, 210, 0.2);
  }

  .edge-toolbar button {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    padding: 0;
    border: 1px solid transparent;
    border-radius: 6px;
    background: transparent;
    color: #1976d2;
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .edge-toolbar button:hover {
    background: #e3f2fd;
    border-color: #90caf9;
    transform: scale(1.05);
  }

  .edge-toolbar button.danger:hover {
    background: #ffebee;
    border-color: #ef9a9a;
    color: #dc3545;
  }

  .edge-label-preview {
    font-size: 12px;
    color: #555;
    max-width: 100px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    padding: 4px 8px;
    border-left: 1px solid #e0e0e0;
    margin-left: 4px;
    background: #f5f5f5;
    border-radius: 4px;
  }

  /* 快速插入节点栏 */
  .quick-insert-bar {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 8px 12px;
    background: linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%);
    border: 1px solid #81c784;
    border-radius: 10px;
    box-shadow: 0 4px 12px rgba(76, 175, 80, 0.2);
  }

  .quick-insert-label {
    font-size: 10px;
    color: #2e7d32;
    font-weight: 500;
    margin-right: 2px;
  }

  .quick-insert-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 26px;
    height: 26px;
    padding: 0;
    border: 1px solid #a5d6a7;
    border-radius: 6px;
    background: #fff;
    color: #2e7d32;
    cursor: pointer;
    transition: all 0.15s;
  }

  .quick-insert-btn svg {
    display: block;
  }

  .quick-insert-btn:hover {
    background: #e8f5e9;
    border-color: #4caf50;
    color: #1b5e20;
    transform: scale(1.1);
    box-shadow: 0 2px 4px rgba(76, 175, 80, 0.25);
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

  /* 节点高亮闪烁动画 */
  .svg-container :global(g.node.node-highlight .label-container),
  .svg-container :global(g.node.node-highlight rect),
  .svg-container :global(g.node.node-highlight polygon),
  .svg-container :global(g.node.node-highlight circle) {
    animation: nodeHighlightPulse 0.5s ease-in-out 3;
  }

  @keyframes nodeHighlightPulse {
    0%, 100% {
      stroke: #1976d2;
      stroke-width: 2px;
      filter: drop-shadow(0 0 0 transparent);
    }
    50% {
      stroke: #4caf50;
      stroke-width: 4px;
      filter: drop-shadow(0 0 8px rgba(76, 175, 80, 0.6));
    }
  }

  /* 拖拽连线目标节点高亮 */
  .svg-container :global(g.node.drag-target .label-container),
  .svg-container :global(g.node.drag-target rect),
  .svg-container :global(g.node.drag-target polygon),
  .svg-container :global(g.node.drag-target circle) {
    stroke: #4caf50 !important;
    stroke-width: 3px !important;
    filter: drop-shadow(0 0 8px rgba(76, 175, 80, 0.5));
    transition: all 0.15s ease;
  }

  /* 边选中状态 */
  .svg-container :global(path.edge-selected) {
    stroke: #1976d2 !important;
    stroke-width: 3px !important;
    filter: drop-shadow(0 0 4px rgba(25, 118, 210, 0.5));
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
