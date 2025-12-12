/**
 * MermaidDataExtractor - 使用 Mermaid 内部 API 提取结构化数据
 *
 * 这个模块利用 Mermaid 的解析器来获取 flowchart 的节点和边数据，
 * 然后我们可以用自己的渲染器来渲染，从而支持交互式编辑。
 */

import mermaid from 'mermaid';

/**
 * 节点数据结构（从 Mermaid 提取）
 */
export interface ExtractedNode {
  id: string;
  label: string;
  shape: string;
  cssClasses?: string;
  cssStyles?: string[];
  domId?: string;
  parentId?: string;
  isGroup?: boolean;
  // 位置信息（布局后填充）
  x?: number;
  y?: number;
  width?: number;
  height?: number;
}

/**
 * 边数据结构（从 Mermaid 提取）
 */
export interface ExtractedEdge {
  id: string;
  start: string;
  end: string;
  label?: string;
  arrowTypeStart: string;
  arrowTypeEnd: string;
  thickness: string;
  pattern: string;
  // 路径点（布局后填充）
  points?: Array<{ x: number; y: number }>;
}

/**
 * 提取的图表数据
 */
export interface ExtractedData {
  nodes: ExtractedNode[];
  edges: ExtractedEdge[];
  direction: string;
  config: {
    nodeSpacing: number;
    rankSpacing: number;
  };
}

/**
 * 从 Mermaid 代码提取结构化数据
 */
export async function extractMermaidData(code: string): Promise<ExtractedData> {
  // 确保 mermaid 已初始化
  mermaid.initialize({
    startOnLoad: false,
    theme: 'default',
    flowchart: {
      useMaxWidth: true,
      htmlLabels: false, // 使用 SVG 标签以便于操作
      curve: 'basis',
    },
    securityLevel: 'loose',
  });

  try {
    // 使用 mermaid 的内部 API 解析代码
    // @ts-expect-error - 访问内部 API
    const { Diagram } = await import('mermaid');
    const diagram = await Diagram.fromText(code);

    // 获取数据库实例
    const db = diagram.db;

    // 检查是否有 getData 方法（flowchart 特有）
    if (typeof db.getData !== 'function') {
      throw new Error('This diagram type does not support data extraction');
    }

    // 获取结构化数据
    const data = db.getData();
    const direction = db.getDirection?.() || 'TB';

    // 转换节点数据
    const nodes: ExtractedNode[] = data.nodes.map((node: any) => ({
      id: node.id,
      label: node.label || node.id,
      shape: mapShape(node.shape),
      cssClasses: node.cssClasses,
      cssStyles: node.cssStyles,
      domId: node.domId,
      parentId: node.parentId,
      isGroup: node.isGroup,
    }));

    // 转换边数据
    const edges: ExtractedEdge[] = data.edges.map((edge: any) => ({
      id: edge.id,
      start: edge.start,
      end: edge.end,
      label: edge.label,
      arrowTypeStart: edge.arrowTypeStart || 'none',
      arrowTypeEnd: edge.arrowTypeEnd || 'arrow_point',
      thickness: edge.thickness || 'normal',
      pattern: edge.pattern || 'solid',
    }));

    return {
      nodes,
      edges,
      direction,
      config: {
        nodeSpacing: data.config?.flowchart?.nodeSpacing || 50,
        rankSpacing: data.config?.flowchart?.rankSpacing || 50,
      },
    };
  } catch (error) {
    console.error('Failed to extract mermaid data:', error);
    throw error;
  }
}

/**
 * 映射 Mermaid 形状名称到我们的形状名称
 */
function mapShape(mermaidShape: string): string {
  const shapeMap: Record<string, string> = {
    squareRect: 'rect',
    roundedRect: 'rounded',
    stadium: 'stadium',
    subroutine: 'subroutine',
    cylinder: 'cylinder',
    circle: 'circle',
    question: 'diamond',
    hexagon: 'hexagon',
    lean_right: 'parallelogram',
    lean_left: 'parallelogram-alt',
    trapezoid: 'trapezoid',
    inv_trapezoid: 'inv-trapezoid',
    doublecircle: 'double-circle',
    text: 'text',
    card: 'card',
    stateStart: 'circle',
    stateEnd: 'double-circle',
  };

  return shapeMap[mermaidShape] || mermaidShape || 'rect';
}

/**
 * 简化版本：直接解析 Mermaid 代码获取基本数据
 * 不依赖内部 API，使用正则表达式解析
 */
export function parseFlowchartBasic(code: string): ExtractedData {
  const nodes: ExtractedNode[] = [];
  const edges: ExtractedEdge[] = [];
  let direction = 'TB';

  const lines = code.split('\n');
  const nodeMap = new Map<string, ExtractedNode>();

  for (const line of lines) {
    const trimmed = line.trim();

    // 解析方向
    const dirMatch = trimmed.match(/^(?:flowchart|graph)\s+(TB|TD|BT|RL|LR)/i);
    if (dirMatch) {
      direction = dirMatch[1].toUpperCase();
      if (direction === 'TD') direction = 'TB';
      continue;
    }

    // 解析节点定义和边
    // 简单的边解析: A --> B, A -->|text| B, etc.
    const edgeMatch = trimmed.match(
      /^(\w+)(?:\[([^\]]*)\]|\{([^}]*)\}|\(([^)]*)\)|\(\(([^)]*)\)\))?(?:\s*)(-->|---|-\.->|==>|<-->|<--->)(?:\|([^|]*)\|)?(?:\s*)(\w+)(?:\[([^\]]*)\]|\{([^}]*)\}|\(([^)]*)\)|\(\(([^)]*)\)\))?/
    );

    if (edgeMatch) {
      const [
        ,
        sourceId,
        sourceRect,
        sourceDiamond,
        sourceRounded,
        sourceCircle,
        arrow,
        edgeLabel,
        targetId,
        targetRect,
        targetDiamond,
        targetRounded,
        targetCircle,
      ] = edgeMatch;

      // 添加源节点
      if (!nodeMap.has(sourceId)) {
        const sourceLabel = sourceRect || sourceDiamond || sourceRounded || sourceCircle || sourceId;
        const sourceShape = getShapeFromSyntax(sourceRect, sourceDiamond, sourceRounded, sourceCircle);
        const node: ExtractedNode = {
          id: sourceId,
          label: sourceLabel,
          shape: sourceShape,
        };
        nodeMap.set(sourceId, node);
        nodes.push(node);
      }

      // 添加目标节点
      if (!nodeMap.has(targetId)) {
        const targetLabel = targetRect || targetDiamond || targetRounded || targetCircle || targetId;
        const targetShape = getShapeFromSyntax(targetRect, targetDiamond, targetRounded, targetCircle);
        const node: ExtractedNode = {
          id: targetId,
          label: targetLabel,
          shape: targetShape,
        };
        nodeMap.set(targetId, node);
        nodes.push(node);
      }

      // 添加边
      const edge: ExtractedEdge = {
        id: `${sourceId}-${targetId}-${edges.length}`,
        start: sourceId,
        end: targetId,
        label: edgeLabel,
        arrowTypeStart: getArrowStart(arrow),
        arrowTypeEnd: getArrowEnd(arrow),
        thickness: getThickness(arrow),
        pattern: getPattern(arrow),
      };
      edges.push(edge);
    }
  }

  return {
    nodes,
    edges,
    direction,
    config: {
      nodeSpacing: 50,
      rankSpacing: 50,
    },
  };
}

function getShapeFromSyntax(
  rect?: string,
  diamond?: string,
  rounded?: string,
  circle?: string
): string {
  if (diamond) return 'diamond';
  if (rounded) return 'rounded';
  if (circle) return 'circle';
  if (rect) return 'rect';
  return 'rect';
}

function getArrowStart(arrow: string): string {
  if (arrow.startsWith('<')) return 'arrow_point';
  return 'none';
}

function getArrowEnd(arrow: string): string {
  if (arrow.endsWith('>')) return 'arrow_point';
  return 'none';
}

function getThickness(arrow: string): string {
  if (arrow.includes('==')) return 'thick';
  return 'normal';
}

function getPattern(arrow: string): string {
  if (arrow.includes('-.')) return 'dotted';
  if (arrow.includes('--')) return 'dashed';
  return 'solid';
}
