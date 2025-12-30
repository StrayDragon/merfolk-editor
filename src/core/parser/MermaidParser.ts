import { FlowchartModel } from '../model/FlowchartModel';
import type { NodeData } from '../model/Node';
import type { EdgeData } from '../model/Edge';
import type { SubGraphData } from '../model/SubGraph';
import type { Direction, ShapeType, StrokeType, ArrowType } from '../model/types';
import { SHAPE_ALIASES } from '../model/types';

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
  // Invisible edge (must be first to avoid matching as normal)
  { pattern: /^~~~$/, stroke: 'invisible', arrowStart: 'none', arrowEnd: 'none', hasText: false },

  // Thick lines (variable length: ==, ===, ====, etc.)
  { pattern: /^<={2,}>$/, stroke: 'thick', arrowStart: 'arrow', arrowEnd: 'arrow', hasText: false },
  { pattern: /^={2,}>$/, stroke: 'thick', arrowStart: 'none', arrowEnd: 'arrow', hasText: false },
  { pattern: /^<==\|(.+?)\|==>$/, stroke: 'thick', arrowStart: 'arrow', arrowEnd: 'arrow', hasText: true },
  { pattern: /^==\|(.+?)\|==>$/, stroke: 'thick', arrowStart: 'none', arrowEnd: 'arrow', hasText: true },
  { pattern: /^==(.+?)==>$/, stroke: 'thick', arrowStart: 'none', arrowEnd: 'arrow', hasText: true },
  { pattern: /^={2,}$/, stroke: 'thick', arrowStart: 'none', arrowEnd: 'none', hasText: false },

  // Dotted lines (variable length: -., -.., -..., etc.)
  { pattern: /^<-\.+->$/, stroke: 'dotted', arrowStart: 'arrow', arrowEnd: 'arrow', hasText: false },
  { pattern: /^-\.+->$/, stroke: 'dotted', arrowStart: 'none', arrowEnd: 'arrow', hasText: false },
  { pattern: /^-.-\|(.+?)\|-.->$/, stroke: 'dotted', arrowStart: 'none', arrowEnd: 'arrow', hasText: true },
  { pattern: /^-\.(.+?)\.-?>$/, stroke: 'dotted', arrowStart: 'none', arrowEnd: 'arrow', hasText: true },
  { pattern: /^-\.+-?$/, stroke: 'dotted', arrowStart: 'none', arrowEnd: 'none', hasText: false },

  // Normal lines with text
  { pattern: /^<--\|(.+?)\|-->$/, stroke: 'normal', arrowStart: 'arrow', arrowEnd: 'arrow', hasText: true },
  { pattern: /^--\|(.+?)\|-->$/, stroke: 'normal', arrowStart: 'none', arrowEnd: 'arrow', hasText: true },
  { pattern: /^--(.+?)-->$/, stroke: 'normal', arrowStart: 'none', arrowEnd: 'arrow', hasText: true },

  // Circle and cross arrows (must come before variable-length patterns)
  { pattern: /^--o$/, stroke: 'normal', arrowStart: 'none', arrowEnd: 'circle', hasText: false },
  { pattern: /^o--o$/, stroke: 'normal', arrowStart: 'circle', arrowEnd: 'circle', hasText: false },
  { pattern: /^--x$/, stroke: 'normal', arrowStart: 'none', arrowEnd: 'cross', hasText: false },
  { pattern: /^x--x$/, stroke: 'normal', arrowStart: 'cross', arrowEnd: 'cross', hasText: false },

  // Normal lines without text (variable length: --, ---, ----, etc.)
  { pattern: /^<-+>$/, stroke: 'normal', arrowStart: 'arrow', arrowEnd: 'arrow', hasText: false },
  { pattern: /^-{2,}>$/, stroke: 'normal', arrowStart: 'none', arrowEnd: 'arrow', hasText: false },
  { pattern: /^-{2,}$/, stroke: 'normal', arrowStart: 'none', arrowEnd: 'none', hasText: false },
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

      // Direction inside subgraph: direction TB/LR/etc.
      if (line.startsWith('direction ')) {
        this.parseDirectionStatement(line, ctx);
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

      // Link style statement: linkStyle 0 stroke:#ff3,stroke-width:4px
      if (line.startsWith('linkStyle ')) {
        this.parseLinkStyleStatement(line, ctx);
        continue;
      }

      // Link/click statement
      if (line.startsWith('click ')) {
        this.parseClickStatement(line, ctx);
        continue;
      }

      // Edge property configuration: e1@{ animate: true }
      // Distinguish from node @{} syntax by checking for edge-specific properties
      const edgePropMatch = line.match(/^(\w+)@\{(.+?)\}$/);
      if (edgePropMatch) {
        const propsStr = edgePropMatch[2];
        // Edge properties contain animate/animation, node properties contain shape/label
        if (propsStr.includes('animate') || propsStr.includes('animation') || propsStr.includes('style')) {
          this.parseEdgeProperties(edgePropMatch[1], propsStr, ctx);
          continue;
        }
        // Fall through to node edge statement parsing for node @{} syntax
      }

      // Node and edge statements
      this.parseNodeEdgeStatement(line, ctx);
    }
  }

  /**
   * Parse edge property configuration: e1@{ animate: true }
   */
  private parseEdgeProperties(edgeId: string, propsStr: string, ctx: ParseContext): void {
    const props = this.parseAtProperties(propsStr);

    // Find the edge with this ID and update its properties
    for (const edge of ctx.edges) {
      if (edge.id === edgeId) {
        if (props.animate === 'true') {
          edge.animate = true;
        }
        if (props.animation) {
          edge.animation = props.animation as 'fast' | 'slow';
        }
        break;
      }
    }
  }

  /**
   * Parse linkStyle statement: linkStyle 0 stroke:#ff3,stroke-width:4px
   * Supports: linkStyle 0 ..., linkStyle 1,2 ..., linkStyle default ...
   */
  private parseLinkStyleStatement(line: string, ctx: ParseContext): void {
    // Match: linkStyle 0 stroke:#ff3,stroke-width:4px
    // or: linkStyle 1,2 stroke:#ff3
    // or: linkStyle default stroke:#333
    const match = line.match(/^linkStyle\s+([\d,\s]+|default)\s+(.+)$/);
    if (!match) return;

    const indexPart = match[1].trim();
    const stylePart = match[2].trim();

    // Parse style properties
    const style: Record<string, string> = {};
    stylePart.split(',').forEach((prop) => {
      const colonIndex = prop.indexOf(':');
      if (colonIndex !== -1) {
        const key = prop.substring(0, colonIndex).trim();
        const value = prop.substring(colonIndex + 1).trim();
        style[key] = value;
      }
    });

    // Apply to edges
    if (indexPart === 'default') {
      // Apply to all edges
      for (const edge of ctx.edges) {
        edge.style = { ...edge.style, ...this.convertToEdgeStyle(style) };
      }
    } else {
      // Parse edge indices
      const indices = indexPart.split(',').map((s) => parseInt(s.trim(), 10));
      for (const index of indices) {
        if (index >= 0 && index < ctx.edges.length) {
          ctx.edges[index].style = { ...ctx.edges[index].style, ...this.convertToEdgeStyle(style) };
        }
      }
    }
  }

  /**
   * Convert CSS-style properties to EdgeStyle
   */
  private convertToEdgeStyle(style: Record<string, string>): { stroke?: string; strokeWidth?: number } {
    const result: { stroke?: string; strokeWidth?: number } = {};
    if (style.stroke) {
      result.stroke = style.stroke;
    }
    if (style['stroke-width']) {
      result.strokeWidth = parseInt(style['stroke-width'], 10);
    }
    return result;
  }

  /**
   * Parse subgraph start: subgraph id [title]
   */
  private parseSubGraphStart(line: string, ctx: ParseContext): void {
    const match = line.match(/^subgraph\s+(\S+)(?:\s*\[(.+?)\])?/);
    if (match) {
      const id = match[1];
      const title = match[2] || id;
      const parentId =
        ctx.subGraphStack.length > 0
          ? ctx.subGraphStack[ctx.subGraphStack.length - 1]
          : undefined;
      ctx.subGraphs.push({
        id,
        title,
        nodeIds: [],
        parentId,
        // Don't inherit direction - subgraph can have its own direction
      });
      ctx.subGraphStack.push(id);
    }
  }

  /**
   * Parse direction statement inside subgraph: direction TB/LR/etc.
   */
  private parseDirectionStatement(line: string, ctx: ParseContext): void {
    const match = line.match(/^direction\s+(TB|BT|LR|RL|TD)/i);
    if (match) {
      let dir = match[1].toUpperCase() as Direction | 'TD';
      if (dir === 'TD') dir = 'TB';

      // If inside a subgraph, set the subgraph's direction
      if (ctx.subGraphStack.length > 0) {
        const currentSubGraphId = ctx.subGraphStack[ctx.subGraphStack.length - 1];
        const subGraph = ctx.subGraphs.find((s) => s.id === currentSubGraphId);
        if (subGraph) {
          subGraph.direction = dir as Direction;
        }
      } else {
        // Otherwise set the graph's direction
        ctx.direction = dir as Direction;
      }
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
   * Also handles multi-node links: A & B --> C & D
   */
  private parseNodeEdgeStatement(line: string, ctx: ParseContext): void {
    // First, expand multi-node links (A & B --> C & D)
    const expandedLines = this.expandMultiNodeLinks(line);

    // Process each expanded line
    for (const expandedLine of expandedLines) {
      this.parseSimpleNodeEdgeStatement(expandedLine, ctx);
    }
  }

  /**
   * Parse a simple node-edge statement (no & operator)
   */
  private parseSimpleNodeEdgeStatement(line: string, ctx: ParseContext): void {
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
          this.createEdge(prevNodeId, nodeId, pendingEdge.operator, pendingEdge.text, ctx, pendingEdge.edgeId);
        }

        prevNodeId = nodeId;
        pendingEdge = null;
      } else if (part.type === 'edge') {
        pendingEdge = { operator: part.content, text: part.text, edgeId: part.edgeId };
      }
    }
  }

  /**
   * Expand multi-node links using & operator
   * Example: "A & B --> C & D" expands to:
   * - "A --> C"
   * - "A --> D"
   * - "B --> C"
   * - "B --> D"
   */
  private expandMultiNodeLinks(line: string): string[] {
    // Check if line contains & operator (not inside brackets/quotes)
    if (!line.includes(' & ') && !line.includes('& ') && !line.includes(' &')) {
      return [line];
    }

    // Find edge operator in the line
    const edgeMatch = line.match(/(~~~|<==?>|<==>|==?>|===?|<-\.->|-\.->|-\.-?|<-->|-->|o--o|x--x|--o|--x|---?)/);
    if (!edgeMatch) {
      return [line];
    }

    const edgeOp = edgeMatch[0];
    const edgeIndex = edgeMatch.index!;

    // Split into left and right parts
    const leftPart = line.substring(0, edgeIndex).trim();
    const rightPart = line.substring(edgeIndex + edgeOp.length).trim();

    // Also capture any text on the edge (|text| or == text ==> format)
    // For simplicity, we'll pass through the full edge operator
    const fullEdgeMatch = line.substring(edgeIndex).match(/^(~~~|<==?>|<==>|==?>|===?|<-\.->|-\.->|-\.-?|<-->|-->|o--o|x--x|--o|--x|---?)(\|[^|]+\|)?/);
    const fullEdge = fullEdgeMatch ? fullEdgeMatch[0] : edgeOp;
    const rightStartIndex = edgeIndex + fullEdge.length;
    const actualRightPart = line.substring(rightStartIndex).trim();

    // Split by & operator (but not inside brackets)
    const leftNodes = this.splitByAmpersand(leftPart);
    const rightNodes = this.splitByAmpersand(actualRightPart);

    // Generate cartesian product
    const result: string[] = [];
    for (const left of leftNodes) {
      for (const right of rightNodes) {
        result.push(`${left.trim()} ${fullEdge} ${right.trim()}`);
      }
    }

    return result;
  }

  /**
   * Split a string by & operator, respecting brackets
   */
  private splitByAmpersand(str: string): string[] {
    const parts: string[] = [];
    let current = '';
    let depth = 0;

    for (let i = 0; i < str.length; i++) {
      const char = str[i];

      if (char === '[' || char === '(' || char === '{') {
        depth++;
        current += char;
      } else if (char === ']' || char === ')' || char === '}') {
        depth--;
        current += char;
      } else if (char === '&' && depth === 0) {
        // Check for surrounding spaces (to not match && or &= etc.)
        const prevChar = str[i - 1];
        const nextChar = str[i + 1];
        if ((prevChar === ' ' || prevChar === undefined) && (nextChar === ' ' || nextChar === undefined)) {
          if (current.trim()) {
            parts.push(current.trim());
          }
          current = '';
          continue;
        }
        current += char;
      } else {
        current += char;
      }
    }

    if (current.trim()) {
      parts.push(current.trim());
    }

    return parts.length > 0 ? parts : [str];
  }

  /**
   * Split a line into node and edge parts
   * Handles Mermaid syntax:
   * - A -->|text| B (pipe-delimited text)
   * - A -- text --> B (space-delimited text)
   * - A -. text .-> B (dotted with space text)
   * - A == text ==> B (thick with space text)
   * - A e1@--> B (edge with explicit ID)
   */
  private splitByEdges(
    line: string
  ): Array<{ type: 'node' | 'edge'; content: string; text?: string; edgeId?: string }> {
    const result: Array<{ type: 'node' | 'edge'; content: string; text?: string; edgeId?: string }> = [];

    // First, try to match space-delimited text patterns (higher priority)
    // These patterns: A -- text --> B, A -. text .-> B, A == text ==> B
    const spaceTextPatterns = [
      // Thick with space text: == text ==>
      /==\s+(.+?)\s+==>/g,
      // Dotted with space text: -. text .->
      /-\.\s*(.+?)\s*\.->/g,
      // Normal with space text: -- text -->
      /--\s+(.+?)\s+-->/g,
      // Normal no arrow with space text: -- text ---
      /--\s+(.+?)\s+---/g,
    ];

    // Try space text patterns first
    for (const pattern of spaceTextPatterns) {
      pattern.lastIndex = 0;
      const match = pattern.exec(line);
      if (match) {
        // Found a space-delimited text pattern
        // Parse: NodeA -- text --> NodeB
        const beforeMatch = line.substring(0, match.index).trim();
        const afterMatch = line.substring(match.index + match[0].length).trim();
        const text = match[1].trim();

        // Determine the edge type from the original match
        const fullMatch = match[0];
        let edgeOp: string;
        if (fullMatch.includes('==>')) {
          edgeOp = '==>';
        } else if (fullMatch.includes('.->')) {
          edgeOp = '-.->'; // Use full dotted arrow syntax for proper detection
        } else if (fullMatch.includes('-->')) {
          edgeOp = '-->';
        } else {
          edgeOp = '---';
        }

        if (beforeMatch) {
          result.push({ type: 'node', content: beforeMatch });
        }
        result.push({ type: 'edge', content: edgeOp, text });
        if (afterMatch) {
          // Recursively parse the remaining part (for chained edges)
          const remaining = this.splitByEdges(afterMatch);
          result.push(...remaining);
        }
        return result;
      }
    }

    // Fall back to standard edge regex
    // Matches: -->, -->|text|, ==>, ==>|text|, -.->, -.->|text|, ~~~, etc.
    // Note: Order matters! Long patterns must come before short ones
    // ~~~ is invisible edge (no text support)
    // Support variable length: --> (1), ---> (2), ----> (3), etc.
    // Support edge ID: e1@--> (captures e1 as edge ID)
    const edgeRegex = /(\w+@)?(~~~|<-+>|<={2,}>|={2,}>|={2,}|<-\.+->|-\.+->|-\.+-?|o--o|x--x|--o|--x|-{2,}>|-{2,})(\|[^|]+\|)?/g;

    let lastIndex = 0;
    let match;

    while ((match = edgeRegex.exec(line)) !== null) {
      // Add node part before this edge
      const nodePart = line.substring(lastIndex, match.index).trim();
      if (nodePart) {
        result.push({ type: 'node', content: nodePart });
      }

      // Parse edge and extract text and edge ID if present
      const edgeIdPart = match[1]; // e1@ part
      const edgeOp = match[2];
      const textPart = match[3]; // |text| part
      const text = textPart ? textPart.slice(1, -1) : undefined; // Remove | delimiters
      const edgeId = edgeIdPart ? edgeIdPart.slice(0, -1) : undefined; // Remove @ suffix

      result.push({ type: 'edge', content: edgeOp, text, edgeId });
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
    // First, try new @{} syntax: id@{ shape: xxx, label: "..." }
    const atSyntaxMatch = content.match(/^(\S+?)@\{(.+?)\}$/);
    if (atSyntaxMatch) {
      const id = atSyntaxMatch[1];
      const propsStr = atSyntaxMatch[2];
      const parsed = this.parseAtProperties(propsStr);
      const shape = this.resolveShapeAlias(parsed.shape || 'rect');
      const text = parsed.label || id;
      this.ensureNode(id, text, shape, ctx, parsed);
      return id;
    }

    // Try to match node with shape: id[text] or id(text) etc.
    for (const { start, end, shape } of SHAPE_PATTERNS) {
      const escapedStart = this.escapeRegex(start);
      const escapedEnd = this.escapeRegex(end);
      const regex = new RegExp(`^(\\S+?)${escapedStart}(.+?)${escapedEnd}$`);
      const match = content.match(regex);

      if (match) {
        const id = match[1];
        let text = match[2].trim();
        // Remove surrounding quotes if present (Mermaid allows quoted text)
        text = this.unquoteText(text);
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
   * Parse @{} property string into an object
   * e.g., "shape: rect, label: 'Hello'" -> { shape: 'rect', label: 'Hello' }
   */
  private parseAtProperties(propsStr: string): Record<string, string> {
    const result: Record<string, string> = {};

    // Split by comma (but not commas inside quotes)
    const parts = propsStr.match(/[^,]+(?:["'][^"']*["'][^,]*)?/g) || [];

    for (const part of parts) {
      const colonIndex = part.indexOf(':');
      if (colonIndex === -1) continue;

      const key = part.substring(0, colonIndex).trim();
      let value = part.substring(colonIndex + 1).trim();

      // Remove surrounding quotes
      value = this.unquoteText(value);

      result[key] = value;
    }

    return result;
  }

  /**
   * Resolve shape alias to canonical shape name
   */
  private resolveShapeAlias(shape: string): ShapeType {
    const normalized = shape.toLowerCase().trim();
    return (SHAPE_ALIASES[normalized] as ShapeType) || (normalized as ShapeType);
  }

  /**
   * Remove surrounding quotes from text
   * Handles: "text", 'text', `text`, "`text`"
   */
  private unquoteText(text: string): string {
    let result = text;

    // Handle Mermaid markdown string syntax: "`text`"
    if (result.startsWith('"`') && result.endsWith('`"')) {
      result = result.slice(2, -2);
    }
    // Handle double quotes: "text"
    else if (result.startsWith('"') && result.endsWith('"') && result.length > 1) {
      result = result.slice(1, -1);
    }
    // Handle single quotes: 'text'
    else if (result.startsWith("'") && result.endsWith("'") && result.length > 1) {
      result = result.slice(1, -1);
    }
    // Handle backticks: `text`
    else if (result.startsWith('`') && result.endsWith('`') && result.length > 1) {
      result = result.slice(1, -1);
    }

    // Decode Mermaid entity codes (HTML-like but with # instead of &)
    result = this.decodeEntityCodes(result);

    return result;
  }

  /**
   * Decode Mermaid entity codes
   * Examples: #quot; -> ", #amp; -> &, #lt; -> <, #gt; -> >
   */
  private decodeEntityCodes(text: string): string {
    const entityMap: Record<string, string> = {
      '#quot;': '"',
      '#apos;': "'",
      '#amp;': '&',
      '#lt;': '<',
      '#gt;': '>',
      '#nbsp;': '\u00A0',
      '#semi;': ';',
      '#colon;': ':',
      '#equals;': '=',
      '#lpar;': '(',
      '#rpar;': ')',
      '#lsqb;': '[',
      '#rsqb;': ']',
      '#lcub;': '{',
      '#rcub;': '}',
      '#pipe;': '|',
      '#comma;': ',',
      '#dash;': '-',
    };

    let result = text;
    for (const [entity, char] of Object.entries(entityMap)) {
      result = result.split(entity).join(char);
    }

    // Handle numeric entities: #35; -> #
    result = result.replace(/#(\d+);/g, (_, code) => String.fromCharCode(parseInt(code, 10)));

    return result;
  }

  /**
   * Ensure a node exists in the context
   */
  private ensureNode(
    id: string,
    text: string,
    shape: ShapeType,
    ctx: ParseContext,
    extraProps?: Record<string, string>
  ): void {
    if (!ctx.nodes.has(id)) {
      const node: NodeData = {
        id,
        text,
        shape,
        cssClasses: [],
      };

      // Handle extra properties from @{} syntax
      if (extraProps) {
        if (extraProps.icon) node.icon = extraProps.icon;
        if (extraProps.img) node.img = extraProps.img;
        if (extraProps.w) node.width = parseInt(extraProps.w);
        if (extraProps.h) node.height = parseInt(extraProps.h);
        if (extraProps.form) node.form = extraProps.form;
        if (extraProps.pos) node.pos = extraProps.pos as 't' | 'b';
      }

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

      // Merge extra properties
      if (extraProps) {
        if (extraProps.icon) existing.icon = extraProps.icon;
        if (extraProps.img) existing.img = extraProps.img;
        if (extraProps.w) existing.width = parseInt(extraProps.w);
        if (extraProps.h) existing.height = parseInt(extraProps.h);
        if (extraProps.form) existing.form = extraProps.form;
        if (extraProps.pos) existing.pos = extraProps.pos as 't' | 'b';
      }
    }
  }

  /**
   * Generate a consistent edge ID based on content
   */
  private generateEdgeId(
    source: string,
    target: string,
    operator: string,
    text: string | undefined,
    stroke: StrokeType,
    arrowStart: ArrowType,
    arrowEnd: ArrowType
  ): string {
    // Create a string that represents all edge properties
    const edgeContent = [
      source,
      target,
      operator,
      text || '',
      stroke,
      arrowStart,
      arrowEnd
    ].join('|');

    // Simple hash function (djb2 algorithm)
    let hash = 5381;
    for (let i = 0; i < edgeContent.length; i++) {
      hash = (hash * 33) ^ edgeContent.charCodeAt(i);
    }

    // Convert to positive hex string and add prefix
    return `edge-${(hash >>> 0).toString(16)}`;
  }

  /**
   * Create an edge between two nodes
   */
  private createEdge(
    source: string,
    target: string,
    operator: string,
    text: string | undefined,
    ctx: ParseContext,
    userEdgeId?: string
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

    // Calculate edge length from operator
    const length = this.calculateEdgeLength(operator, stroke);

    // Use user-defined ID or generate one
    const edgeId = userEdgeId || this.generateEdgeId(source, target, operator, text, stroke, arrowStart, arrowEnd);
    const isUserDefinedId = !!userEdgeId;

    const edge: EdgeData = {
      id: edgeId,
      source,
      target,
      text,
      stroke,
      arrowStart,
      arrowEnd,
      length,
      isUserDefinedId,
    };

    ctx.edges.push(edge);
  }

  /**
   * Calculate edge length from operator
   * --> = 1, ---> = 2, ----> = 3
   * ==> = 1, ===> = 2, ====> = 3
   * -.-> = 1, -..-> = 2, -...-> = 3
   */
  private calculateEdgeLength(operator: string, stroke: StrokeType): number {
    if (stroke === 'invisible') {
      return 1;
    }

    // Count the dash/equal/dot characters
    if (stroke === 'thick') {
      // Count = characters
      const matches = operator.match(/=+/g);
      if (matches) {
        const maxLen = Math.max(...matches.map((m) => m.length));
        return Math.max(1, maxLen - 1);
      }
    } else if (stroke === 'dotted') {
      // Count . characters between - and ->
      const matches = operator.match(/\.+/g);
      if (matches) {
        const maxLen = Math.max(...matches.map((m) => m.length));
        return Math.max(1, maxLen);
      }
    } else {
      // Normal: count - characters
      const matches = operator.match(/-+/g);
      if (matches) {
        const maxLen = Math.max(...matches.map((m) => m.length));
        return Math.max(1, maxLen - 1);
      }
    }

    return 1;
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
