import type { FlowchartModel } from '../model/FlowchartModel';
import type { FlowNode } from '../model/Node';
import type { FlowEdge } from '../model/Edge';
import type { FlowSubGraph } from '../model/SubGraph';
import type { ShapeType } from '../model/types';

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
 * Shape syntax mapping
 */
const SHAPE_SYNTAX: Record<ShapeType, [string, string]> = {
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

    // Serialize subgraphs
    for (const subGraph of model.subGraphs) {
      lines.push('');
      lines.push(this.options.indent + this.serializeSubGraphStart(subGraph));

      const nodes = subGraphNodes.get(subGraph.id) || [];
      for (const node of nodes) {
        lines.push(this.options.indent + this.options.indent + this.serializeNode(node));
      }

      lines.push(this.options.indent + 'end');
    }

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
    const [start, end] = SHAPE_SYNTAX[node.shape] || SHAPE_SYNTAX.rect;

    // If text equals id and shape is rect, just output id
    if (node.text === node.id && node.shape === 'rect') {
      return node.id;
    }

    // Check if text needs quoting (contains special characters that might conflict with Mermaid syntax)
    const text = this.formatNodeText(node.text, node.shape);

    return `${node.id}${start}${text}${end}`;
  }

  /**
   * Format node text for Mermaid syntax
   * Uses backtick syntax for special characters (Mermaid's markdown string)
   */
  private formatNodeText(text: string, shape: ShapeType): string {
    // Characters that might conflict with Mermaid syntax
    const specialChars = /[\[\]{}()<>|\\\/\n\r"#]/;

    // Get the shape delimiters to check for conflicts
    const [start, end] = SHAPE_SYNTAX[shape] || SHAPE_SYNTAX.rect;

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
