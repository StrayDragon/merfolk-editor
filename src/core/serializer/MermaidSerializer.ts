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
   * Uses backtick syntax for special characters (Mermaid's markdown string)
   */
  private formatNodeText(text: string, shape: ShapeType): string {
    // Characters that might conflict with Mermaid syntax
    const specialChars = /[\[\]{}()<>|\\\/\n\r"#]/;

    // Get the shape delimiters to check for conflicts
    const [start, end] = isLegacyShape(shape)
      ? LEGACY_SHAPE_SYNTAX[shape]
      : LEGACY_SHAPE_SYNTAX.rect;

    // Check if text contains any delimiter characters or special chars
    const needsEscaping = specialChars.test(text) ||
                          text.includes(start) ||
                          text.includes(end) ||
                          text.includes('-->') ||
                          text.includes('---') ||
                          text.includes('`');

    if (needsEscaping) {
      // Use Mermaid's markdown string syntax with backticks
      // Escape any backticks in the text
      const escaped = text.replace(/`/g, '#96;');
      return `"\`${escaped}\`"`;
    }

    return text;
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
    for (const subGraph of subGraphs) {
      if (serialized.has(subGraph.id)) continue;

      // Check if this subgraph's parent matches the current level
      // For now, we use a simple approach: subgraphs without a parent are root level
      const isRootLevel = parentId === undefined;
      const belongsToParent = isRootLevel; // TODO: enhance with actual parent tracking

      if (!belongsToParent && parentId !== undefined) continue;

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
      const nestedSubGraphs = subGraphs.filter((s) =>
        s.nodeIds?.some((nodeId) => subGraph.nodeIds?.includes(nodeId)) && !serialized.has(s.id)
      );
      if (nestedSubGraphs.length > 0) {
        this.serializeSubGraphsRecursive(
          nestedSubGraphs,
          subGraphNodes,
          subGraph.id,
          lines,
          currentIndent + this.options.indent,
          serialized
        );
      }

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
    const specialChars = /[\[\]{}()<>|\\\/\n\r"#`]/;

    if (specialChars.test(title)) {
      // Use Mermaid's markdown string syntax with backticks
      const escaped = title.replace(/`/g, '#96;');
      return `"\`${escaped}\`"`;
    }

    return title;
  }

  /**
   * Serialize a single edge
   */
  private serializeEdge(edge: FlowEdge): string {
    const operator = this.getEdgeOperator(edge);
    return `${edge.source} ${operator} ${edge.target}`;
  }

  /**
   * Get the edge operator string
   * Mermaid syntax: A -->|text| B or A --> B
   */
  private getEdgeOperator(edge: FlowEdge): string {
    const { stroke, arrowStart, arrowEnd, text } = edge;

    // Build base operator based on stroke type and arrows
    let baseOp = '';

    if (stroke === 'dotted') {
      // Dotted lines
      if (arrowStart === 'arrow' && arrowEnd === 'arrow') {
        baseOp = '<-.->';
      } else if (arrowEnd === 'arrow') {
        baseOp = '-.->';
      } else if (arrowStart === 'arrow') {
        baseOp = '<-.-';
      } else {
        baseOp = '-.-';
      }
    } else if (stroke === 'thick') {
      // Thick lines
      if (arrowStart === 'arrow' && arrowEnd === 'arrow') {
        baseOp = '<==>';
      } else if (arrowEnd === 'arrow') {
        baseOp = '==>';
      } else if (arrowStart === 'arrow') {
        baseOp = '<==';
      } else {
        baseOp = '===';
      }
    } else {
      // Normal lines
      if (arrowStart === 'arrow' && arrowEnd === 'arrow') {
        baseOp = '<-->';
      } else if (arrowStart === 'arrow') {
        baseOp = '<--';
      } else if (arrowEnd === 'arrow') {
        baseOp = '-->';
      } else if (arrowStart === 'circle' && arrowEnd === 'circle') {
        baseOp = 'o--o';
      } else if (arrowStart === 'cross' && arrowEnd === 'cross') {
        baseOp = 'x--x';
      } else if (arrowEnd === 'circle') {
        baseOp = '--o';
      } else if (arrowEnd === 'cross') {
        baseOp = '--x';
      } else {
        baseOp = '---';
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
