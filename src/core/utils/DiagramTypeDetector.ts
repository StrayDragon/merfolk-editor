/**
 * Mermaid 图类型定义
 */
export type DiagramType =
  | 'flowchart'
  | 'sequenceDiagram'
  | 'classDiagram'
  | 'stateDiagram'
  | 'erDiagram'
  | 'gantt'
  | 'pie'
  | 'gitGraph'
  | 'journey'
  | 'mindmap'
  | 'timeline'
  | 'quadrantChart'
  | 'xychart'
  | 'requirementDiagram'
  | 'sankey'
  | 'c4'
  | 'block'
  | 'architecture'
  | 'packet'
  | 'kanban'
  | 'zenuml'
  | 'radar'
  | 'treemap'
  | 'unknown';

/**
 * 图类型信息
 */
export interface DiagramTypeInfo {
  type: DiagramType;
  displayName: string;
  isEditable: boolean;
  description: string;
}

/**
 * 图类型检测模式
 */
const DIAGRAM_PATTERNS: Array<{
  pattern: RegExp;
  type: DiagramType;
  displayName: string;
  isEditable: boolean;
  description: string;
}> = [
  // Flowchart (完整支持)
  {
    pattern: /^\s*(flowchart|graph)\s+(TB|TD|BT|RL|LR)/im,
    type: 'flowchart',
    displayName: 'Flowchart',
    isEditable: true,
    description: '流程图 - 完整支持节点和边的可视化编辑',
  },
  // Sequence Diagram
  {
    pattern: /^\s*sequenceDiagram/im,
    type: 'sequenceDiagram',
    displayName: 'Sequence Diagram',
    isEditable: false,
    description: '时序图 - 仅支持代码编辑和预览',
  },
  // Class Diagram
  {
    pattern: /^\s*classDiagram/im,
    type: 'classDiagram',
    displayName: 'Class Diagram',
    isEditable: false,
    description: '类图 - 仅支持代码编辑和预览',
  },
  // State Diagram
  {
    pattern: /^\s*stateDiagram(-v2)?/im,
    type: 'stateDiagram',
    displayName: 'State Diagram',
    isEditable: false,
    description: '状态图 - 仅支持代码编辑和预览',
  },
  // ER Diagram
  {
    pattern: /^\s*erDiagram/im,
    type: 'erDiagram',
    displayName: 'ER Diagram',
    isEditable: false,
    description: '实体关系图 - 仅支持代码编辑和预览',
  },
  // Gantt
  {
    pattern: /^\s*gantt/im,
    type: 'gantt',
    displayName: 'Gantt Chart',
    isEditable: false,
    description: '甘特图 - 仅支持代码编辑和预览',
  },
  // Pie
  {
    pattern: /^\s*pie/im,
    type: 'pie',
    displayName: 'Pie Chart',
    isEditable: false,
    description: '饼图 - 仅支持代码编辑和预览',
  },
  // Git Graph
  {
    pattern: /^\s*gitGraph/im,
    type: 'gitGraph',
    displayName: 'Git Graph',
    isEditable: false,
    description: 'Git 分支图 - 仅支持代码编辑和预览',
  },
  // User Journey
  {
    pattern: /^\s*journey/im,
    type: 'journey',
    displayName: 'User Journey',
    isEditable: false,
    description: '用户旅程图 - 仅支持代码编辑和预览',
  },
  // Mindmap
  {
    pattern: /^\s*mindmap/im,
    type: 'mindmap',
    displayName: 'Mindmap',
    isEditable: false,
    description: '思维导图 - 仅支持代码编辑和预览',
  },
  // Timeline
  {
    pattern: /^\s*timeline/im,
    type: 'timeline',
    displayName: 'Timeline',
    isEditable: false,
    description: '时间线 - 仅支持代码编辑和预览',
  },
  // Quadrant Chart
  {
    pattern: /^\s*quadrantChart/im,
    type: 'quadrantChart',
    displayName: 'Quadrant Chart',
    isEditable: false,
    description: '象限图 - 仅支持代码编辑和预览',
  },
  // XY Chart
  {
    pattern: /^\s*xychart(-beta)?/im,
    type: 'xychart',
    displayName: 'XY Chart',
    isEditable: false,
    description: 'XY 图表 - 仅支持代码编辑和预览',
  },
  // Requirement Diagram
  {
    pattern: /^\s*requirementDiagram/im,
    type: 'requirementDiagram',
    displayName: 'Requirement Diagram',
    isEditable: false,
    description: '需求图 - 仅支持代码编辑和预览',
  },
  // Sankey
  {
    pattern: /^\s*sankey(-beta)?/im,
    type: 'sankey',
    displayName: 'Sankey Diagram',
    isEditable: false,
    description: '桑基图 - 仅支持代码编辑和预览',
  },
  // C4 Diagrams
  {
    pattern: /^\s*C4(Context|Container|Component|Dynamic|Deployment)/im,
    type: 'c4',
    displayName: 'C4 Diagram',
    isEditable: false,
    description: 'C4 架构图 - 仅支持代码编辑和预览',
  },
  // Block Diagram
  {
    pattern: /^\s*block(-beta)?/im,
    type: 'block',
    displayName: 'Block Diagram',
    isEditable: false,
    description: '块图 - 仅支持代码编辑和预览',
  },
  // Architecture Diagram
  {
    pattern: /^\s*architecture(-beta)?/im,
    type: 'architecture',
    displayName: 'Architecture Diagram',
    isEditable: false,
    description: '架构图 - 仅支持代码编辑和预览',
  },
  // Packet Diagram
  {
    pattern: /^\s*packet(-beta)?/im,
    type: 'packet',
    displayName: 'Packet Diagram',
    isEditable: false,
    description: '数据包图 - 仅支持代码编辑和预览',
  },
  // Kanban
  {
    pattern: /^\s*kanban/im,
    type: 'kanban',
    displayName: 'Kanban',
    isEditable: false,
    description: '看板 - 仅支持代码编辑和预览',
  },
  // ZenUML
  {
    pattern: /^\s*zenuml/im,
    type: 'zenuml',
    displayName: 'ZenUML',
    isEditable: false,
    description: 'ZenUML - 仅支持代码编辑和预览',
  },
  // Radar
  {
    pattern: /^\s*radar(-beta)?/im,
    type: 'radar',
    displayName: 'Radar Chart',
    isEditable: false,
    description: '雷达图 - 仅支持代码编辑和预览',
  },
  // Treemap
  {
    pattern: /^\s*treemap(-beta)?/im,
    type: 'treemap',
    displayName: 'Treemap',
    isEditable: false,
    description: '树形图 - 仅支持代码编辑和预览',
  },
];

/**
 * 检测 Mermaid 代码的图类型
 */
export function detectDiagramType(code: string): DiagramTypeInfo {
  // 移除 frontmatter(如 ---\ntitle: xxx\n---)
  const cleanCode = code.replace(/^---[\s\S]*?---\s*/m, '').trim();

  for (const { pattern, type, displayName, isEditable, description } of DIAGRAM_PATTERNS) {
    if (pattern.test(cleanCode)) {
      return { type, displayName, isEditable, description };
    }
  }

  return {
    type: 'unknown',
    displayName: 'Unknown',
    isEditable: false,
    description: '未知图类型 - 仅支持代码编辑和预览',
  };
}

/**
 * 检查代码是否为可编辑的 Flowchart
 */
export function isEditableFlowchart(code: string): boolean {
  const info = detectDiagramType(code);
  return info.type === 'flowchart' && info.isEditable;
}

/**
 * 获取所有支持的图类型信息
 */
export function getAllDiagramTypes(): DiagramTypeInfo[] {
  return DIAGRAM_PATTERNS.map(({ type, displayName, isEditable, description }) => ({
    type,
    displayName,
    isEditable,
    description,
  }));
}

