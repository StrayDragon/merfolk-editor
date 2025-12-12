import dagre from '@dagrejs/dagre';
import type { FlowchartModel } from '../../core/model/FlowchartModel';
import type { Direction } from '../../core/model/types';
import { ShapeRenderer } from '../shapes/ShapeRenderer';

/**
 * Layout options
 */
export interface LayoutOptions {
  /** Node horizontal spacing (default: 50) */
  nodesep?: number;
  /** Rank (level) spacing (default: 50) */
  ranksep?: number;
  /** Edge label spacing (default: 10) */
  edgesep?: number;
  /** Rank direction (default: from model) */
  rankdir?: Direction;
  /** Alignment within rank (default: 'UL') */
  align?: 'UL' | 'UR' | 'DL' | 'DR';
  /** Use acyclic algorithm (default: true) */
  acyclicer?: 'greedy' | undefined;
  /** Ranker algorithm (default: 'network-simplex') */
  ranker?: 'network-simplex' | 'tight-tree' | 'longest-path';
}

/**
 * Dagre-based layout engine
 * Calculates node positions using hierarchical layout algorithm
 */
export class DagreLayout {
  private options: Required<LayoutOptions>;

  constructor(options: LayoutOptions = {}) {
    // Use Mermaid's default spacing values
    this.options = {
      nodesep: options.nodesep ?? 50,  // Mermaid default nodeSpacing
      ranksep: options.ranksep ?? 50,  // Mermaid default rankSpacing
      edgesep: options.edgesep ?? 10,
      rankdir: options.rankdir ?? 'TB',
      align: options.align ?? 'UL',
      acyclicer: options.acyclicer ?? 'greedy',
      ranker: options.ranker ?? 'network-simplex',
    };
  }

  /**
   * Calculate layout for a flowchart model
   */
  layout(model: FlowchartModel): void {
    // Create dagre graph with multigraph support for multiple edges between same nodes
    const g = new dagre.graphlib.Graph({ compound: true, multigraph: true });

    // Set graph options
    g.setGraph({
      rankdir: model.direction || this.options.rankdir,
      nodesep: this.options.nodesep,
      ranksep: this.options.ranksep,
      edgesep: this.options.edgesep,
      align: this.options.align,
      acyclicer: this.options.acyclicer,
      ranker: this.options.ranker,
    });

    // Default edge label
    g.setDefaultEdgeLabel(() => ({}));

    // Add nodes
    for (const node of model.nodes) {
      // Calculate node dimensions
      const bounds = node.bounds || ShapeRenderer.calculateBounds(node);
      g.setNode(node.id, {
        width: bounds.width,
        height: bounds.height,
        label: node.text,
      });
    }

    // Add subgraphs (compound nodes)
    for (const subGraph of model.subGraphs) {
      g.setNode(subGraph.id, {
        label: subGraph.title,
        clusterLabelPos: 'top',
      });

      // Set parent for nodes in subgraph
      for (const nodeId of subGraph.nodeIds) {
        if (g.hasNode(nodeId)) {
          g.setParent(nodeId, subGraph.id);
        }
      }
    }

    // Add edges - use edge.id as the name to support multiple edges between same nodes
    for (const edge of model.edges) {
      g.setEdge(edge.source, edge.target, {
        label: edge.text || '',
        width: edge.text ? edge.text.length * 7 + 10 : 0,
        height: edge.text ? 20 : 0,
      }, edge.id); // Pass edge.id as the name parameter
    }

    // Run layout algorithm
    dagre.layout(g);

    // Apply calculated positions to nodes
    for (const node of model.nodes) {
      const dagreNode = g.node(node.id);
      if (dagreNode) {
        node.bounds = {
          x: dagreNode.x,
          y: dagreNode.y,
          width: dagreNode.width,
          height: dagreNode.height,
        };
      }
    }

    // Apply calculated positions to edges
    // In multigraph mode, we need to iterate through g.edges() to get edge objects
    const dagreEdges = g.edges();
    for (const e of dagreEdges) {
      // e is { v: source, w: target, name: edgeId }
      const dagreEdge = g.edge(e);
      if (dagreEdge && dagreEdge.points) {
        // Find the corresponding model edge by name (which is edge.id)
        const modelEdge = model.edges.find(edge => edge.id === e.name);
        if (modelEdge) {
          modelEdge.points = dagreEdge.points.map((p: { x: number; y: number }) => ({
            x: p.x,
            y: p.y,
          }));
        }
      }
    }
  }

  /**
   * Update layout options
   */
  setOptions(options: Partial<LayoutOptions>): void {
    Object.assign(this.options, options);
  }

  /**
   * Get current layout options
   */
  getOptions(): LayoutOptions {
    return { ...this.options };
  }
}
