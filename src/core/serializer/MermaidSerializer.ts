import type { FlowchartModel } from '../model/FlowchartModel';
import type { FlowNode } from '../model/Node';
import type { FlowEdge } from '../model/Edge';
import type { FlowSubGraph } from '../model/SubGraph';
import type { ShapeType, LegacyShapeType } from '../model/types';

/**
 * Serialization options
 */
export interface SerializerOptions {
  /** Indentation string (default: '    ') */
  indent?: string;
  /** Whether to include style statements (default: true) */
  includeStyles?: boolean;
  /** Whether to include class definitions (default: true) */
  includeClassDefs?: boolean;
}

/**
 * Legacy shape syntax mapping (bracket-based syntax)
 */
const LEGACY_SHAPE_SYNTAX: Record<LegacyShapeType, [string, string]> = {
  rect: ['[', ']'],
  rounded: ['(', ')'],
  stadium: ['([', '])'],
  subroutine: ['[[', ']]'],
  cylinder: ['[(', ')]'],
  circle: ['((', '))'],
  doublecircle: ['(((', ')))'],
  diamond: ['{', '}'],
  hexagon: ['{{', '}}'],
  trapezoid: ['[/', '/]'],
  inv_trapezoid: ['[\\', '\\]'],
  lean_right: ['[/', '\\]'],
  lean_left: ['[\\', '/]'],
  odd: ['>', ']'],
};

/**
 * Check if a shape is a legacy shape type
 */
function isLegacyShape(shape: ShapeType): shape is LegacyShapeType {
  return shape in LEGACY_SHAPE_SYNTAX;
}

/**
 * Mermaid Flowchart Serializer
 * Converts FlowchartModel back to Mermaid syntax
 */
export class MermaidSerializer {
  private options: Required<SerializerOptions>;

  constructor(options: SerializerOptions = {}) {
    this.options = {
      indent: options.indent ?? '    ',
      includeStyles: options.includeStyles ?? true,
      includeClassDefs: options.includeClassDefs ?? true,
    };
  }

  /**
   * Serialize a FlowchartModel to Mermaid text
   */
  serialize(model: FlowchartModel): string {
    const lines: string[] = [];

    // Graph declaration
    lines.push(`flowchart ${model.direction}`);

    // Collect nodes by subgraph
    const rootNodes: FlowNode[] = [];
    const subGraphNodes: Map<string, FlowNode[]> = new Map();

    for (const node of model.nodes) {
      if (node.parentId) {
        const nodes = subGraphNodes.get(node.parentId) || [];
        nodes.push(node);
        subGraphNodes.set(node.parentId, nodes);
      } else {
        rootNodes.push(node);
      }
    }

    // Serialize root nodes
    for (const node of rootNodes) {
      lines.push(this.options.indent + this.serializeNode(node));
    }

    // Serialize subgraphs (handle nesting)
    const serializedSubGraphs = new Set<string>();
    this.serializeSubGraphsRecursive(
      model.subGraphs,
      subGraphNodes,
      undefined,
      lines,
      this.options.indent,
      serializedSubGraphs
    );

    // Serialize edges
    if (model.edges.length > 0) {
      lines.push('');
      for (const edge of model.edges) {
        lines.push(this.options.indent + this.serializeEdge(edge));
      }
    }

    // Serialize edge properties (animation, etc.)
    const edgeProps = this.serializeEdgeProperties(model);
    if (edgeProps.length > 0) {
      lines.push('');
      lines.push(...edgeProps.map((l) => this.options.indent + l));
    }

    // Serialize link styles
    const linkStyles = this.serializeLinkStyles(model);
    if (linkStyles.length > 0) {
      lines.push('');
      lines.push(...linkStyles.map((l) => this.options.indent + l));
    }

    // Serialize class definitions
    if (this.options.includeClassDefs) {
      const classDefs = this.serializeClassDefs(model);
      if (classDefs.length > 0) {
        lines.push('');
        lines.push(...classDefs.map((l) => this.options.indent + l));
      }
    }

    // Serialize class assignments
    const classAssignments = this.serializeClassAssignments(model);
    if (classAssignments.length > 0) {
      lines.push('');
      lines.push(...classAssignments.map((l) => this.options.indent + l));
    }

    // Serialize style statements
    if (this.options.includeStyles) {
      const styles = this.serializeStyles(model);
      if (styles.length > 0) {
        lines.push('');
        lines.push(...styles.map((l) => this.options.indent + l));
      }
    }

    // Serialize click/link statements
    const links = this.serializeLinks(model);
    if (links.length > 0) {
      lines.push('');
      lines.push(...links.map((l) => this.options.indent + l));
    }

    return lines.join('\n');
  }

  /**
   * Serialize a single node
   */
  private serializeNode(node: FlowNode): string {
    // If text equals id and shape is rect, just output id
    if (node.text === node.id && node.shape === 'rect') {
      return node.id;
    }

    // Use legacy bracket syntax for legacy shapes
    if (isLegacyShape(node.shape)) {
      const [start, end] = LEGACY_SHAPE_SYNTAX[node.shape];
      const text = this.formatNodeText(node.text, node.shape);
      return `${node.id}${start}${text}${end}`;
    }

    // Use new @{} syntax for extended shapes
    return this.serializeNodeWithAtSyntax(node);
  }

  /**
   * Serialize a node using the new @{} syntax
   */
  private serializeNodeWithAtSyntax(node: FlowNode): string {
    const props: string[] = [];

    props.push(`shape: ${node.shape}`);

    if (node.text && node.text !== node.id) {
      props.push(`label: "${node.text}"`);
    }

    if (node.icon) {
      props.push(`icon: "${node.icon}"`);
    }

    if (node.img) {
      props.push(`img: "${node.img}"`);
    }

    if (node.form) {
      props.push(`form: "${node.form}"`);
    }

    if (node.pos) {
      props.push(`pos: "${node.pos}"`);
    }

    if (node.width) {
      props.push(`w: ${node.width}`);
    }

    if (node.height) {
      props.push(`h: ${node.height}`);
    }

    return `${node.id}@{ ${props.join(', ')} }`;
  }

  /**
   * Format node text for Mermaid syntax
   * Uses quoted text for HTML/Unicode and markdown strings only for markdown content
   */
  private formatNodeText(text: string, shape: ShapeType): string {
    const normalized = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    const hasHtmlLike = /<[^>]+>/.test(normalized);
    if (hasHtmlLike) {
      return `"${this.escapeQuotedText(normalized)}"`;
    }

    const hasMarkdown = this.isMarkdownText(normalized);

    // Characters that might conflict with Mermaid syntax
    const specialChars = /[\[\]{}()<>|\\\/\n"#]/;

    // Get the shape delimiters to check for conflicts
    const [start, end] = isLegacyShape(shape)
      ? LEGACY_SHAPE_SYNTAX[shape]
      : LEGACY_SHAPE_SYNTAX.rect;

    // Check if text contains any delimiter characters or special chars
    const needsQuotes = specialChars.test(normalized) ||
      normalized.includes(start) ||
      normalized.includes(end) ||
      normalized.includes('-->') ||
      normalized.includes('---') ||
      normalized.includes('`') ||
      /[^\x20-\x7E]/.test(normalized);

    if (hasMarkdown) {
      const escaped = this.escapeMarkdownText(normalized);
      return `"\`${escaped}\`"`;
    }

    if (needsQuotes) {
      return `"${this.escapeQuotedText(normalized)}"`;
    }

    return normalized;
  }

  private isMarkdownText(text: string): boolean {
    return /(\*\*|__|~~|\n)/.test(text);
  }

  private escapeQuotedText(text: string): string {
    const normalized = this.normalizeQuoteEntities(text);
    return normalized.replace(/"/g, '#quot;');
  }

  private escapeMarkdownText(text: string): string {
    const normalized = this.normalizeQuoteEntities(text);
    return normalized
      .replace(/`/g, '#96;')
      .replace(/"/g, '#quot;');
  }

  private normalizeQuoteEntities(text: string): string {
    return text
      .replace(/#quot;/g, '"')
      .replace(/&quot;/g, '"');
  }

  /**
   * Recursively serialize subgraphs with proper nesting
   */
  private serializeSubGraphsRecursive(
    subGraphs: FlowSubGraph[],
    subGraphNodes: Map<string, FlowNode[]>,
    parentId: string | undefined,
    lines: string[],
    currentIndent: string,
    serialized: Set<string>
  ): void {
    // Find subgraphs that belong to this parent level
    const levelSubGraphs = subGraphs.filter(
      (subGraph) =>
        !serialized.has(subGraph.id) &&
        (subGraph.parentId ?? undefined) === parentId
    );

    for (const subGraph of levelSubGraphs) {
      if (serialized.has(subGraph.id)) continue;

      serialized.add(subGraph.id);
      lines.push('');
      lines.push(currentIndent + this.serializeSubGraphStart(subGraph));

      // Add direction if the subgraph has its own direction
      if (subGraph.direction) {
        lines.push(currentIndent + this.options.indent + `direction ${subGraph.direction}`);
      }

      // Add nodes in this subgraph
      const nodes = subGraphNodes.get(subGraph.id) || [];
      for (const node of nodes) {
        lines.push(currentIndent + this.options.indent + this.serializeNode(node));
      }

      // Recursively serialize nested subgraphs
      this.serializeSubGraphsRecursive(
        subGraphs,
        subGraphNodes,
        subGraph.id,
        lines,
        currentIndent + this.options.indent,
        serialized
      );

      lines.push(currentIndent + 'end');
    }
  }

  /**
   * Serialize subgraph start
   */
  private serializeSubGraphStart(subGraph: FlowSubGraph): string {
    if (subGraph.title === subGraph.id) {
      return `subgraph ${subGraph.id}`;
    }
    // Use quotes for subgraph titles with special characters
    const title = this.formatSubgraphTitle(subGraph.title);
    return `subgraph ${subGraph.id}[${title}]`;
  }

  /**
   * Format subgraph title for Mermaid syntax
   */
  private formatSubgraphTitle(title: string): string {
    const normalized = title.replace(/\r?\n/g, ' ').trim();
    const escaped = normalized
      .replace(/&/g, '#amp;')
      .replace(/"/g, '#quot;')
      .replace(/\[/g, '#lsqb;')
      .replace(/\]/g, '#rsqb;')
      .replace(/`/g, '#96;')
      .replace(/\|/g, '#124;')
      .replace(/</g, '#lt;')
      .replace(/>/g, '#gt;');

    const needsQuotes =
      /[()]/.test(normalized) ||
      /[^\x20-\x7E]/.test(normalized);

    if (!needsQuotes && escaped === normalized) {
      return escaped;
    }

    return `"${escaped}"`;
  }

  /**
   * Serialize a single edge
   */
  private serializeEdge(edge: FlowEdge): string {
    const operator = this.getEdgeOperator(edge);
    const edgeIdPrefix = this.getEdgeIdPrefix(edge);
    return `${edge.source} ${edgeIdPrefix}${operator} ${edge.target}`;
  }

  /**
   * Determine whether to include edge ID in the edge statement
   */
  private getEdgeIdPrefix(edge: FlowEdge): string {
    if (edge.isUserDefinedId || edge.animate || edge.animation) {
      return `${edge.id}@`;
    }
    return '';
  }

  /**
   * Get the edge operator string
   * Mermaid syntax: A -->|text| B or A --> B
   */
  private getEdgeOperator(edge: FlowEdge): string {
    const { stroke, arrowStart, arrowEnd, text } = edge;
    const defaultLength =
      edge.length ??
      ((stroke === 'normal' && arrowStart === 'none' && arrowEnd === 'none') ||
      (stroke === 'thick' && arrowStart === 'none' && arrowEnd === 'none')
        ? 2
        : 1);
    const length = Math.max(1, defaultLength);

    // Build base operator based on stroke type and arrows
    let baseOp = '';

    if (stroke === 'invisible') {
      baseOp = '~~~';
    } else if (stroke === 'dotted') {
      const dots = '.'.repeat(length);
      const body = `-${dots}-`;
      if (arrowStart === 'arrow' && arrowEnd === 'arrow') {
        baseOp = `<${body}>`;
      } else if (arrowEnd === 'arrow') {
        baseOp = `${body}>`;
      } else if (arrowStart === 'arrow') {
        baseOp = `<${body}`;
      } else {
        baseOp = body;
      }
    } else if (stroke === 'thick') {
      const equals = '='.repeat(length + 1);
      if (arrowStart === 'arrow' && arrowEnd === 'arrow') {
        baseOp = `<${equals}>`;
      } else if (arrowEnd === 'arrow') {
        baseOp = `${equals}>`;
      } else if (arrowStart === 'arrow') {
        baseOp = `<${equals}`;
      } else {
        baseOp = equals;
      }
    } else {
      const dashes = '-'.repeat(length + 1);
      // Normal lines (support circle/cross endpoints)
      if (arrowStart === 'circle' && arrowEnd === 'circle') {
        baseOp = `o${dashes}o`;
      } else if (arrowStart === 'cross' && arrowEnd === 'cross') {
        baseOp = `x${dashes}x`;
      } else if (arrowEnd === 'circle' && arrowStart === 'none') {
        baseOp = `${dashes}o`;
      } else if (arrowEnd === 'cross' && arrowStart === 'none') {
        baseOp = `${dashes}x`;
      } else if (arrowStart === 'circle' && arrowEnd === 'none') {
        baseOp = `o${dashes}`;
      } else if (arrowStart === 'cross' && arrowEnd === 'none') {
        baseOp = `x${dashes}`;
      } else if (arrowStart === 'arrow' && arrowEnd === 'arrow') {
        baseOp = `<${dashes}>`;
      } else if (arrowStart === 'arrow') {
        baseOp = `<${dashes}`;
      } else if (arrowEnd === 'arrow') {
        baseOp = `${dashes}>`;
      } else {
        baseOp = dashes;
      }
    }

    // Add text label using pipe syntax: -->|text| or -- text -->
    if (text) {
      // Escape special characters in edge text
      const escapedText = this.formatEdgeText(text);

      // Mermaid edge label syntax: ARROW|text| (pipe after arrow, before target)
      // Examples: -->|text|, ==>|text|, -.->|text|, ---||text|
      return `${baseOp}|${escapedText}|`;
    }

    return baseOp;
  }

  /**
   * Format edge text for Mermaid syntax
   * Edge labels use pipe delimiters, so we need to escape pipes
   */
  private formatEdgeText(text: string): string {
    // Escape pipe characters and other problematic chars
    return text
      .replace(/\|/g, '#124;')  // pipe
      .replace(/"/g, '#quot;')   // double quote
      .replace(/\n/g, ' ')       // newline
      .replace(/\r/g, '');       // carriage return
  }

  /**
   * Serialize edge property statements (animate/animation)
   */
  private serializeEdgeProperties(model: FlowchartModel): string[] {
    const lines: string[] = [];

    for (const edge of model.edges) {
      if (!edge.animate && !edge.animation) continue;

      const props: string[] = [];
      if (edge.animate) {
        props.push('animate: true');
      }
      if (edge.animation) {
        props.push(`animation: ${edge.animation}`);
      }

      if (props.length > 0) {
        lines.push(`${edge.id}@{ ${props.join(', ')} }`);
      }
    }

    return lines;
  }

  /**
   * Serialize linkStyle statements for edges
   */
  private serializeLinkStyles(model: FlowchartModel): string[] {
    const lines: string[] = [];

    model.edges.forEach((edge, index) => {
      if (!edge.style) return;

      const styles: string[] = [];
      if (edge.style.stroke) {
        styles.push(`stroke:${edge.style.stroke}`);
      }
      if (edge.style.strokeWidth !== undefined) {
        styles.push(`stroke-width:${edge.style.strokeWidth}px`);
      }

      if (styles.length > 0) {
        lines.push(`linkStyle ${index} ${styles.join(',')}`);
      }
    });

    return lines;
  }

  /**
   * Serialize class definitions
   */
  private serializeClassDefs(model: FlowchartModel): string[] {
    const lines: string[] = [];
    const data = model.toData();

    if (data.classDefs) {
      for (const [name, def] of Object.entries(data.classDefs)) {
        if (def.styles.length > 0) {
          lines.push(`classDef ${name} ${def.styles.join(',')}`);
        }
      }
    }

    return lines;
  }

  /**
   * Serialize class assignments
   */
  private serializeClassAssignments(model: FlowchartModel): string[] {
    const lines: string[] = [];

    // Group nodes by class
    const classMappings: Map<string, string[]> = new Map();

    for (const node of model.nodes) {
      for (const className of node.cssClasses) {
        const nodes = classMappings.get(className) || [];
        nodes.push(node.id);
        classMappings.set(className, nodes);
      }
    }

    for (const [className, nodeIds] of classMappings) {
      lines.push(`class ${nodeIds.join(',')} ${className}`);
    }

    return lines;
  }

  /**
   * Serialize inline style statements
   */
  private serializeStyles(model: FlowchartModel): string[] {
    const lines: string[] = [];

    for (const node of model.nodes) {
      if (node.style) {
        const styles: string[] = [];
        if (node.style.fill) styles.push(`fill:${node.style.fill}`);
        if (node.style.stroke) styles.push(`stroke:${node.style.stroke}`);
        if (node.style.strokeWidth)
          styles.push(`stroke-width:${node.style.strokeWidth}px`);
        if (node.style.color) styles.push(`color:${node.style.color}`);

        if (styles.length > 0) {
          lines.push(`style ${node.id} ${styles.join(',')}`);
        }
      }
    }

    return lines;
  }

  /**
   * Serialize click/link statements
   */
  private serializeLinks(model: FlowchartModel): string[] {
    const lines: string[] = [];

    for (const node of model.nodes) {
      if (node.link) {
        let line = `click ${node.id} "${node.link}"`;
        if (node.linkTarget) {
          line += ` "${node.linkTarget}"`;
        }
        lines.push(line);
      }
    }

    return lines;
  }

}
