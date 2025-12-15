import * as d3 from 'd3';
import type { FlowchartModel } from '../core/model/FlowchartModel';
import type { FlowNode } from '../core/model/Node';
import type { FlowEdge } from '../core/model/Edge';
import type { Position } from '../core/model/types';
import { ShapeRenderer } from './shapes/ShapeRenderer';
import { EdgeRenderer } from './edges/EdgeRenderer';
import { DagreLayout } from './layout/DagreLayout';

/**
 * Canvas renderer options
 */
export interface CanvasRendererOptions {
  /** Container element or selector */
  container: HTMLElement | string;
  /** Initial width (default: container width) */
  width?: number;
  /** Initial height (default: container height) */
  height?: number;
  /** Enable zoom/pan (default: true) */
  zoomEnabled?: boolean;
  /** Minimum zoom level (default: 0.1) */
  minZoom?: number;
  /** Maximum zoom level (default: 4) */
  maxZoom?: number;
  /** Padding around the graph (default: 50) */
  padding?: number;
}

/**
 * Main canvas renderer using D3.js
 * Renders FlowchartModel to SVG
 */
export class CanvasRenderer {
  private container: HTMLElement;
  private svg: d3.Selection<SVGSVGElement, unknown, null, undefined>;
  private rootGroup: d3.Selection<SVGGElement, unknown, null, undefined>;
  private nodesGroup: d3.Selection<SVGGElement, unknown, null, undefined>;
  private edgesGroup: d3.Selection<SVGGElement, unknown, null, undefined>;
  private defsGroup: d3.Selection<SVGDefsElement, unknown, null, undefined>;

  private zoom: d3.ZoomBehavior<SVGSVGElement, unknown>;
  private currentTransform: d3.ZoomTransform = d3.zoomIdentity;

  private shapeRenderer: ShapeRenderer;
  private edgeRenderer: EdgeRenderer;
  private layout: DagreLayout;

  private model: FlowchartModel | null = null;
  private options: Required<CanvasRendererOptions>;

  // Selection state
  private selectedNodeIds: Set<string> = new Set();
  private selectedEdgeIds: Set<string> = new Set();

  // Event callbacks
  private onNodeClick?: (node: FlowNode, event: MouseEvent) => void;
  private onEdgeClick?: (edge: FlowEdge, event: MouseEvent) => void;
  private onCanvasClick?: (event: MouseEvent) => void;
  private onNodeDragEnd?: (node: FlowNode, position: Position) => void;

  constructor(options: CanvasRendererOptions) {
    // Resolve container
    if (typeof options.container === 'string') {
      const el = document.querySelector(options.container);
      if (!el) throw new Error(`Container not found: ${options.container}`);
      this.container = el as HTMLElement;
    } else {
      this.container = options.container;
    }

    // Set default options
    const rect = this.container.getBoundingClientRect();
    this.options = {
      container: this.container,
      width: options.width ?? (rect.width || 800),
      height: options.height ?? (rect.height || 600),
      zoomEnabled: options.zoomEnabled ?? true,
      minZoom: options.minZoom ?? 0.1,
      maxZoom: options.maxZoom ?? 4,
      padding: options.padding ?? 50,
    };

    // Create SVG - matching Mermaid's default background
    this.svg = d3
      .select(this.container)
      .append('svg')
      .attr('width', '100%')
      .attr('height', '100%')
      .attr('viewBox', `0 0 ${this.options.width} ${this.options.height}`)
      .attr('class', 'flowchart')
      .style('background', 'white');

    // Create defs for markers
    this.defsGroup = this.svg.append('defs');

    // Create root group for zoom/pan
    this.rootGroup = this.svg.append('g').attr('class', 'canvas-root');

    // Create layer groups
    this.edgesGroup = this.rootGroup.append('g').attr('class', 'edges-layer');
    this.nodesGroup = this.rootGroup.append('g').attr('class', 'nodes-layer');

    // Initialize zoom behavior
    this.zoom = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([this.options.minZoom, this.options.maxZoom])
      .on('zoom', (event) => {
        this.currentTransform = event.transform;
        this.rootGroup.attr('transform', event.transform.toString());
      });

    if (this.options.zoomEnabled) {
      this.svg.call(this.zoom);
    }

    // Canvas click handler
    this.svg.on('click', (event) => {
      if (event.target === this.svg.node()) {
        this.clearSelection();
        this.onCanvasClick?.(event);
      }
    });

    // Initialize renderers
    this.shapeRenderer = new ShapeRenderer();
    this.edgeRenderer = new EdgeRenderer(this.defsGroup);
    this.layout = new DagreLayout();
  }

  /**
   * Set the model to render
   */
  setModel(model: FlowchartModel): void {
    this.model = model;
  }

  /**
   * Render the current model
   */
  render(): void {
    if (!this.model) return;

    // Calculate layout
    this.layout.layout(this.model);

    // Clear existing content
    this.nodesGroup.selectAll('*').remove();
    this.edgesGroup.selectAll('*').remove();

    // Render edges first (below nodes)
    this.renderEdges();

    // Render nodes
    this.renderNodes();

    // Fit to view
    this.fitToView();
  }

  /**
   * Render all nodes
   */
  private renderNodes(): void {
    if (!this.model) return;

    for (const node of this.model.nodes) {
      this.renderNode(node);
    }
  }

  /**
   * Render a single node
   */
  private renderNode(node: FlowNode): void {
    const bounds = node.bounds;
    if (!bounds) return;

    const nodeGroup = this.nodesGroup
      .append('g')
      .attr('class', 'node')
      .attr('data-id', node.id)
      .attr('transform', `translate(${bounds.x}, ${bounds.y})`);

    // Render shape
    this.shapeRenderer.render(nodeGroup, node, bounds);

    // Add selection highlight
    if (this.selectedNodeIds.has(node.id)) {
      nodeGroup.classed('selected', true);
    }

    // Click handler
    nodeGroup.on('click', (event) => {
      event.stopPropagation();
      this.selectNode(node.id);
      this.onNodeClick?.(node, event);
    });

    // Setup drag behavior
    this.setupNodeDrag(nodeGroup, node);
  }

  /**
   * Setup drag behavior for a node
   */
  private setupNodeDrag(
    nodeGroup: d3.Selection<SVGGElement, unknown, null, undefined>,
    node: FlowNode
  ): void {
    const drag = d3
      .drag<SVGGElement, unknown>()
      .on('start', () => {
        nodeGroup.raise();
        nodeGroup.classed('dragging', true);
      })
      .on('drag', (event) => {
        const bounds = node.bounds;
        if (!bounds) return;

        // Update position
        const newX = bounds.x + event.dx;
        const newY = bounds.y + event.dy;

        node.position = { x: newX, y: newY };
        node.bounds = { ...bounds, x: newX, y: newY };

        nodeGroup.attr('transform', `translate(${newX}, ${newY})`);

        // Update connected edges
        this.updateEdgesForNode(node.id);
      })
      .on('end', () => {
        nodeGroup.classed('dragging', false);
        const bounds = node.bounds;
        if (bounds) {
          this.onNodeDragEnd?.(node, { x: bounds.x, y: bounds.y });
        }
      });

    nodeGroup.call(drag);
  }

  /**
   * Update edges connected to a node
   */
  private updateEdgesForNode(nodeId: string): void {
    if (!this.model) return;

    // Clear all edge elements completely
    this.edgesGroup.selectAll('*').remove();

    // Re-render all edges from the model
    // This ensures complete consistency and avoids any DOM/state issues
    for (const edge of this.model.edges) {
      this.renderEdge(edge);
    }
  }

  /**
   * Render all edges
   */
  private renderEdges(): void {
    if (!this.model) return;

    for (const edge of this.model.edges) {
      this.renderEdge(edge);
    }
  }

  /**
   * Render a single edge
   */
  private renderEdge(edge: FlowEdge): void {
    if (!this.model) return;

    const sourceNode = this.model.getNode(edge.source);
    const targetNode = this.model.getNode(edge.target);

    if (!sourceNode?.bounds || !targetNode?.bounds) return;

    const edgeGroup = this.edgesGroup
      .append('g')
      .attr('class', 'edge')
      .attr('data-id', edge.id);

    this.edgeRenderer.render(edgeGroup, edge, sourceNode.bounds, targetNode.bounds);

    // Add selection highlight
    if (this.selectedEdgeIds.has(edge.id)) {
      edgeGroup.classed('selected', true);
    }

    // Click handler
    edgeGroup.on('click', (event) => {
      event.stopPropagation();
      this.selectEdge(edge.id);
      this.onEdgeClick?.(edge, event);
    });
  }

  /**
   * Select a node
   */
  selectNode(nodeId: string, addToSelection = false): void {
    if (!addToSelection) {
      this.clearSelection();
    }

    this.selectedNodeIds.add(nodeId);
    this.nodesGroup.select(`[data-id="${nodeId}"]`).classed('selected', true);
  }

  /**
   * Select an edge
   */
  selectEdge(edgeId: string, addToSelection = false): void {
    if (!addToSelection) {
      this.clearSelection();
    }

    this.selectedEdgeIds.add(edgeId);
    this.edgesGroup.select(`[data-id="${edgeId}"]`).classed('selected', true);
  }

  /**
   * Clear all selections
   */
  clearSelection(): void {
    this.selectedNodeIds.clear();
    this.selectedEdgeIds.clear();
    this.nodesGroup.selectAll('.selected').classed('selected', false);
    this.edgesGroup.selectAll('.selected').classed('selected', false);
  }

  /**
   * Get selected node IDs
   */
  getSelectedNodeIds(): string[] {
    return Array.from(this.selectedNodeIds);
  }

  /**
   * Get selected edge IDs
   */
  getSelectedEdgeIds(): string[] {
    return Array.from(this.selectedEdgeIds);
  }

  /**
   * Fit the view to show all content
   */
  fitToView(): void {
    const rootNode = this.rootGroup.node();
    if (!rootNode) return;

    const bbox = rootNode.getBBox();
    if (bbox.width === 0 || bbox.height === 0) return;

    const padding = this.options.padding;
    const width = this.options.width;
    const height = this.options.height;

    const scale = Math.min(
      (width - padding * 2) / bbox.width,
      (height - padding * 2) / bbox.height,
      1 // Don't zoom in beyond 100%
    );

    const translateX = (width - bbox.width * scale) / 2 - bbox.x * scale;
    const translateY = (height - bbox.height * scale) / 2 - bbox.y * scale;

    const transform = d3.zoomIdentity.translate(translateX, translateY).scale(scale);

    this.svg.transition().duration(300).call(this.zoom.transform, transform);
  }

  /**
   * Reset zoom to identity
   */
  resetZoom(): void {
    this.svg.transition().duration(300).call(this.zoom.transform, d3.zoomIdentity);
  }

  /**
   * Zoom to a specific level
   */
  zoomTo(scale: number): void {
    const transform = d3.zoomIdentity
      .translate(this.currentTransform.x, this.currentTransform.y)
      .scale(scale);
    this.svg.transition().duration(300).call(this.zoom.transform, transform);
  }

  /**
   * Get current zoom level
   */
  getZoomLevel(): number {
    return this.currentTransform.k;
  }

  /**
   * Resize the canvas
   */
  resize(width: number, height: number): void {
    this.options.width = width;
    this.options.height = height;
    this.svg.attr('viewBox', `0 0 ${width} ${height}`);
  }

  /**
   * Set event callbacks
   */
  setCallbacks(callbacks: {
    onNodeClick?: (node: FlowNode, event: MouseEvent) => void;
    onEdgeClick?: (edge: FlowEdge, event: MouseEvent) => void;
    onCanvasClick?: (event: MouseEvent) => void;
    onNodeDragEnd?: (node: FlowNode, position: Position) => void;
  }): void {
    this.onNodeClick = callbacks.onNodeClick;
    this.onEdgeClick = callbacks.onEdgeClick;
    this.onCanvasClick = callbacks.onCanvasClick;
    this.onNodeDragEnd = callbacks.onNodeDragEnd;
  }

  /**
   * Destroy the renderer and clean up
   */
  destroy(): void {
    this.svg.remove();
  }
}
