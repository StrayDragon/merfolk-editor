import { FlowchartModel } from '../model/FlowchartModel';
import type { NodeData } from '../model/Node';
import type { EdgeData } from '../model/Edge';
import type { SubGraphData } from '../model/SubGraph';
import type { Direction, ShapeType, StrokeType, ArrowType } from '../model/types';

/**
 * Parse context for tracking state during parsing
 */
interface ParseContext {
  direction: Direction;
  nodes: Map<string, NodeData>;
  edges: EdgeData[];
  subGraphs: SubGraphData[];
  classDefs: Map<string, { styles: string[]; textStyles: string[] }>;
  subGraphStack: string[];
  edgeCounter: number;
}

/**
 * Shape syntax patterns mapping to ShapeType
 */
const SHAPE_PATTERNS: Array<{
  start: string;
  end: string;
  shape: ShapeType;
}> = [
  { start: '(((', end: ')))', shape: 'doublecircle' },
  { start: '((', end: '))', shape: 'circle' },
  { start: '([', end: '])', shape: 'stadium' },
  { start: '[(', end: ')]', shape: 'cylinder' },
  { start: '[[', end: ']]', shape: 'subroutine' },
  { start: '{{', end: '}}', shape: 'hexagon' },
  { start: '[/', end: '/]', shape: 'trapezoid' },
  { start: '[\\', end: '\\]', shape: 'inv_trapezoid' },
  { start: '[/', end: '\\]', shape: 'lean_right' },
  { start: '[\\', end: '/]', shape: 'lean_left' },
  { start: '>', end: ']', shape: 'odd' },
  { start: '{', end: '}', shape: 'diamond' },
  { start: '(', end: ')', shape: 'rounded' },
  { start: '[', end: ']', shape: 'rect' },
];

/**
 * Edge arrow patterns
 */
const EDGE_PATTERNS: Array<{
  pattern: RegExp;
  stroke: StrokeType;
  arrowStart: ArrowType;
  arrowEnd: ArrowType;
  hasText: boolean;
}> = [
  // Thick lines
  { pattern: /^<==>$/, stroke: 'thick', arrowStart: 'arrow', arrowEnd: 'arrow', hasText: false },
  { pattern: /^==>$/, stroke: 'thick', arrowStart: 'none', arrowEnd: 'arrow', hasText: false },
  { pattern: /^<==\|(.+?)\|==>$/, stroke: 'thick', arrowStart: 'arrow', arrowEnd: 'arrow', hasText: true },
  { pattern: /^==\|(.+?)\|==>$/, stroke: 'thick', arrowStart: 'none', arrowEnd: 'arrow', hasText: true },
  { pattern: /^==(.+?)==>$/, stroke: 'thick', arrowStart: 'none', arrowEnd: 'arrow', hasText: true },
  { pattern: /^===?$/, stroke: 'thick', arrowStart: 'none', arrowEnd: 'none', hasText: false },

  // Dotted lines
  { pattern: /^<-.->$/, stroke: 'dotted', arrowStart: 'arrow', arrowEnd: 'arrow', hasText: false },
  { pattern: /^-.->$/, stroke: 'dotted', arrowStart: 'none', arrowEnd: 'arrow', hasText: false },
  { pattern: /^-.-\|(.+?)\|-.->$/, stroke: 'dotted', arrowStart: 'none', arrowEnd: 'arrow', hasText: true },
  { pattern: /^-\.(.+?)\.-?>$/, stroke: 'dotted', arrowStart: 'none', arrowEnd: 'arrow', hasText: true },
  { pattern: /^-\.-?$/, stroke: 'dotted', arrowStart: 'none', arrowEnd: 'none', hasText: false },

  // Normal lines with text
  { pattern: /^<--\|(.+?)\|-->$/, stroke: 'normal', arrowStart: 'arrow', arrowEnd: 'arrow', hasText: true },
  { pattern: /^--\|(.+?)\|-->$/, stroke: 'normal', arrowStart: 'none', arrowEnd: 'arrow', hasText: true },
  { pattern: /^--(.+?)-->$/, stroke: 'normal', arrowStart: 'none', arrowEnd: 'arrow', hasText: true },

  // Normal lines without text
  { pattern: /^<-->$/, stroke: 'normal', arrowStart: 'arrow', arrowEnd: 'arrow', hasText: false },
  { pattern: /^-->$/, stroke: 'normal', arrowStart: 'none', arrowEnd: 'arrow', hasText: false },
  { pattern: /^---?$/, stroke: 'normal', arrowStart: 'none', arrowEnd: 'none', hasText: false },

  // Circle and cross arrows
  { pattern: /^--o$/, stroke: 'normal', arrowStart: 'none', arrowEnd: 'circle', hasText: false },
  { pattern: /^o--o$/, stroke: 'normal', arrowStart: 'circle', arrowEnd: 'circle', hasText: false },
  { pattern: /^--x$/, stroke: 'normal', arrowStart: 'none', arrowEnd: 'cross', hasText: false },
  { pattern: /^x--x$/, stroke: 'normal', arrowStart: 'cross', arrowEnd: 'cross', hasText: false },
];

/**
 * Mermaid Flowchart Parser
 * Parses Mermaid flowchart syntax into FlowchartModel
 */
export class MermaidParser {
  /**
   * Parse Mermaid text into a FlowchartModel
   */
  parse(text: string): FlowchartModel {
    const ctx = this.createContext();
    const lines = this.preprocess(text);

    // Parse graph declaration
    const startIndex = this.parseGraphDeclaration(lines, ctx);

    // Parse statements
    this.parseStatements(lines, startIndex, ctx);

    // Build and return model
    return this.buildModel(ctx);
  }

  /**
   * Create initial parse context
   */
  private createContext(): ParseContext {
    return {
      direction: 'TB',
      nodes: new Map(),
      edges: [],
      subGraphs: [],
      classDefs: new Map(),
      subGraphStack: [],
      edgeCounter: 0,
    };
  }

  /**
   * Preprocess text: remove comments, normalize whitespace
   */
  private preprocess(text: string): string[] {
    return text
      .split('\n')
      .map((line) => {
        // Remove %% comments
        const commentIndex = line.indexOf('%%');
        if (commentIndex !== -1) {
          line = line.substring(0, commentIndex);
        }
        return line.trim();
      })
      .filter((line) => line.length > 0);
  }

  /**
   * Parse the graph/flowchart declaration line
   */
  private parseGraphDeclaration(lines: string[], ctx: ParseContext): number {
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const match = line.match(/^(flowchart|graph)\s*(TB|BT|LR|RL|TD)?/i);
      if (match) {
        let dir = match[2]?.toUpperCase() as Direction | 'TD' | undefined;
        if (dir === 'TD') dir = 'TB';
        ctx.direction = dir || 'TB';
        return i + 1;
      }
    }
    return 0;
  }

  /**
   * Parse all statements after the declaration
   */
  private parseStatements(
    lines: string[],
    startIndex: number,
    ctx: ParseContext
  ): void {
    for (let i = startIndex; i < lines.length; i++) {
      const line = lines[i];

      // Skip empty lines
      if (!line) continue;

      // Subgraph start
      if (line.startsWith('subgraph')) {
        this.parseSubGraphStart(line, ctx);
        continue;
      }

      // Subgraph end
      if (line === 'end') {
        ctx.subGraphStack.pop();
        continue;
      }

      // Class definition
      if (line.startsWith('classDef')) {
        this.parseClassDef(line, ctx);
        continue;
      }

      // Class assignment
      if (line.startsWith('class ')) {
        this.parseClassAssignment(line, ctx);
        continue;
      }

      // Style statement
      if (line.startsWith('style ')) {
        this.parseStyleStatement(line, ctx);
        continue;
      }

      // Link/click statement
      if (line.startsWith('click ')) {
        this.parseClickStatement(line, ctx);
        continue;
      }

      // Node and edge statements
      this.parseNodeEdgeStatement(line, ctx);
    }
  }

  /**
   * Parse subgraph start: subgraph id [title]
   */
  private parseSubGraphStart(line: string, ctx: ParseContext): void {
    const match = line.match(/^subgraph\s+(\S+)(?:\s*\[(.+?)\])?/);
    if (match) {
      const id = match[1];
      const title = match[2] || id;
      ctx.subGraphs.push({
        id,
        title,
        nodeIds: [],
        direction: ctx.direction,
      });
      ctx.subGraphStack.push(id);
    }
  }

  /**
   * Parse class definition: classDef className fill:#f9f,stroke:#333
   */
  private parseClassDef(line: string, ctx: ParseContext): void {
    const match = line.match(/^classDef\s+(\S+)\s+(.+)$/);
    if (match) {
      const name = match[1];
      const styleStr = match[2];
      const styles = styleStr.split(',').map((s) => s.trim());
      ctx.classDefs.set(name, { styles, textStyles: [] });
    }
  }

  /**
   * Parse class assignment: class nodeId1,nodeId2 className
   */
  private parseClassAssignment(line: string, ctx: ParseContext): void {
    const match = line.match(/^class\s+(.+?)\s+(\S+)$/);
    if (match) {
      const nodeIds = match[1].split(',').map((s) => s.trim());
      const className = match[2];
      for (const nodeId of nodeIds) {
        const node = ctx.nodes.get(nodeId);
        if (node) {
          node.cssClasses = node.cssClasses || [];
          if (!node.cssClasses.includes(className)) {
            node.cssClasses.push(className);
          }
        }
      }
    }
  }

  /**
   * Parse style statement: style nodeId fill:#f9f
   */
  private parseStyleStatement(line: string, ctx: ParseContext): void {
    const match = line.match(/^style\s+(\S+)\s+(.+)$/);
    if (match) {
      const nodeId = match[1];
      const styleStr = match[2];
      const node = ctx.nodes.get(nodeId);
      if (node) {
        // Parse style string into style object
        const styles = styleStr.split(',').map((s) => s.trim());
        node.style = node.style || {};
        for (const style of styles) {
          const [key, value] = style.split(':').map((s) => s.trim());
          if (key === 'fill') node.style.fill = value;
          else if (key === 'stroke') node.style.stroke = value;
          else if (key === 'stroke-width')
            node.style.strokeWidth = parseInt(value);
          else if (key === 'color') node.style.color = value;
        }
      }
    }
  }

  /**
   * Parse click statement: click nodeId "url" or click nodeId callback
   */
  private parseClickStatement(line: string, ctx: ParseContext): void {
    const match = line.match(/^click\s+(\S+)\s+"([^"]+)"(?:\s+"([^"]+)")?/);
    if (match) {
      const nodeId = match[1];
      const link = match[2];
      const target = match[3] as '_self' | '_blank' | '_parent' | '_top' | undefined;
      const node = ctx.nodes.get(nodeId);
      if (node) {
        node.link = link;
        if (target) node.linkTarget = target;
      }
    }
  }

  /**
   * Parse node and edge statements: A --> B or A[text] --> B[text]
   */
  private parseNodeEdgeStatement(line: string, ctx: ParseContext): void {
    // Split by edge operators while preserving them
    const parts = this.splitByEdges(line);

    if (parts.length === 0) return;

    // Process each part
    let prevNodeId: string | null = null;
    let pendingEdge: { operator: string; text?: string } | null = null;

    for (const part of parts) {
      if (part.type === 'node') {
        const nodeId = this.parseNodePart(part.content, ctx);

        // If we have a pending edge, create it
        if (prevNodeId && pendingEdge) {
          this.createEdge(prevNodeId, nodeId, pendingEdge.operator, pendingEdge.text, ctx);
        }

        prevNodeId = nodeId;
        pendingEdge = null;
      } else if (part.type === 'edge') {
        pendingEdge = { operator: part.content, text: part.text };
      }
    }
  }

  /**
   * Split a line into node and edge parts
   * Handles Mermaid syntax: A -->|text| B or A --> B
   */
  private splitByEdges(
    line: string
  ): Array<{ type: 'node' | 'edge'; content: string; text?: string }> {
    const result: Array<{ type: 'node' | 'edge'; content: string; text?: string }> = [];

    // Regex to match edge operators with optional |text| label
    // Matches: -->, -->|text|, ==>, ==>|text|, -.->, -.->|text|, etc.
    const edgeRegex = /(<==?>|<==>|==?>|===?|<-\.->|-\.->|-\.-?|<-->|-->|---?|--o|o--o|--x|x--x)(\|[^|]+\|)?/g;

    let lastIndex = 0;
    let match;

    while ((match = edgeRegex.exec(line)) !== null) {
      // Add node part before this edge
      const nodePart = line.substring(lastIndex, match.index).trim();
      if (nodePart) {
        result.push({ type: 'node', content: nodePart });
      }

      // Parse edge and extract text if present
      const edgeOp = match[1];
      const textPart = match[2]; // |text| part
      const text = textPart ? textPart.slice(1, -1) : undefined; // Remove | delimiters

      result.push({ type: 'edge', content: edgeOp, text });
      lastIndex = match.index + match[0].length;
    }

    // Add remaining node part
    const remaining = line.substring(lastIndex).trim();
    if (remaining) {
      result.push({ type: 'node', content: remaining });
    }

    return result;
  }

  /**
   * Parse a node part and return its ID
   */
  private parseNodePart(content: string, ctx: ParseContext): string {
    // Try to match node with shape: id[text] or id(text) etc.
    for (const { start, end, shape } of SHAPE_PATTERNS) {
      const escapedStart = this.escapeRegex(start);
      const escapedEnd = this.escapeRegex(end);
      const regex = new RegExp(`^(\\S+?)${escapedStart}(.+?)${escapedEnd}$`);
      const match = content.match(regex);

      if (match) {
        const id = match[1];
        const text = match[2].trim();
        this.ensureNode(id, text, shape, ctx);
        return id;
      }
    }

    // Plain node ID without shape
    const id = content.trim();
    if (id) {
      this.ensureNode(id, id, 'rect', ctx);
    }
    return id;
  }

  /**
   * Ensure a node exists in the context
   */
  private ensureNode(
    id: string,
    text: string,
    shape: ShapeType,
    ctx: ParseContext
  ): void {
    if (!ctx.nodes.has(id)) {
      const node: NodeData = {
        id,
        text,
        shape,
        cssClasses: [],
      };

      // Add to current subgraph if any
      if (ctx.subGraphStack.length > 0) {
        const currentSubGraph = ctx.subGraphStack[ctx.subGraphStack.length - 1];
        node.parentId = currentSubGraph;
        const subGraph = ctx.subGraphs.find((s) => s.id === currentSubGraph);
        if (subGraph) {
          subGraph.nodeIds.push(id);
        }
      }

      ctx.nodes.set(id, node);
    } else {
      // Update existing node if text/shape provided
      const existing = ctx.nodes.get(id)!;
      if (text !== id) existing.text = text;
      if (shape !== 'rect') existing.shape = shape;
    }
  }

  /**
   * Create an edge between two nodes
   */
  private createEdge(
    source: string,
    target: string,
    operator: string,
    text: string | undefined,
    ctx: ParseContext
  ): void {
    // Parse the operator to determine stroke and arrows
    let stroke: StrokeType = 'normal';
    let arrowStart: ArrowType = 'none';
    let arrowEnd: ArrowType = 'arrow';

    // Clean operator for matching
    const cleanOp = operator.replace(/\|[^|]+\|/g, '|text|');

    for (const pattern of EDGE_PATTERNS) {
      if (pattern.pattern.test(cleanOp) || pattern.pattern.test(operator)) {
        stroke = pattern.stroke;
        arrowStart = pattern.arrowStart;
        arrowEnd = pattern.arrowEnd;
        break;
      }
    }

    const edge: EdgeData = {
      id: `edge-${++ctx.edgeCounter}`,
      source,
      target,
      text,
      stroke,
      arrowStart,
      arrowEnd,
    };

    ctx.edges.push(edge);
  }

  /**
   * Escape special regex characters
   */
  private escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  /**
   * Build FlowchartModel from parse context
   */
  private buildModel(ctx: ParseContext): FlowchartModel {
    const model = new FlowchartModel();
    model.direction = ctx.direction;

    // Add nodes
    for (const nodeData of ctx.nodes.values()) {
      model.addNode(nodeData);
    }

    // Add edges
    for (const edgeData of ctx.edges) {
      model.addEdge(edgeData);
    }

    // Add subgraphs
    for (const subGraphData of ctx.subGraphs) {
      model.addSubGraph(subGraphData);
    }

    // Add class definitions
    for (const [name, def] of ctx.classDefs) {
      model.defineClass(name, def.styles, def.textStyles);
    }

    return model;
  }
}
