import { FlowNode, type NodeData } from './Node';
import { FlowEdge, type EdgeData } from './Edge';
import { FlowSubGraph, type SubGraphData } from './SubGraph';
import { EventEmitter } from './EventEmitter';
import type { Direction, ModelChangeEvent } from './types';

/**
 * Complete flowchart data for serialization
 */
export interface FlowchartData {
  direction: Direction;
  nodes: NodeData[];
  edges: EdgeData[];
  subGraphs: SubGraphData[];
  classDefs?: Record<string, { styles: string[]; textStyles: string[] }>;
}

/**
 * Main flowchart model - single source of truth
 * Emits events on changes for UI synchronization
 */
export class FlowchartModel extends EventEmitter<ModelChangeEvent> {
  private _direction: Direction = 'TB';
  private _nodes: Map<string, FlowNode> = new Map();
  private _edges: Map<string, FlowEdge> = new Map();
  private _subGraphs: Map<string, FlowSubGraph> = new Map();
  private _classDefs: Map<string, { styles: string[]; textStyles: string[] }> =
    new Map();

  // Batch update state
  private _batchDepth = 0;
  private _batchChanges: ModelChangeEvent[] = [];

  // Edge ID counter for auto-generated IDs
  private _edgeCounter = 0;

  // ============ Properties ============

  get direction(): Direction {
    return this._direction;
  }

  set direction(value: Direction) {
    if (this._direction !== value) {
      const prev = this._direction;
      this._direction = value;
      this.emitChange({
        type: 'direction:change',
        previousValue: prev,
        newValue: value,
      });
    }
  }

  get nodes(): FlowNode[] {
    return Array.from(this._nodes.values());
  }

  get edges(): FlowEdge[] {
    return Array.from(this._edges.values());
  }

  get subGraphs(): FlowSubGraph[] {
    return Array.from(this._subGraphs.values());
  }

  get nodeCount(): number {
    return this._nodes.size;
  }

  get edgeCount(): number {
    return this._edges.size;
  }

  // ============ Node Operations ============

  /**
   * Add a new node to the model
   */
  addNode(data: NodeData): FlowNode {
    if (this._nodes.has(data.id)) {
      throw new Error(`Node with id "${data.id}" already exists`);
    }
    const node = new FlowNode(data);
    this._nodes.set(node.id, node);
    this.emitChange({ type: 'node:add', target: node, newValue: node });
    return node;
  }

  /**
   * Get a node by ID
   */
  getNode(id: string): FlowNode | undefined {
    return this._nodes.get(id);
  }

  /**
   * Check if a node exists
   */
  hasNode(id: string): boolean {
    return this._nodes.has(id);
  }

  /**
   * Update an existing node
   */
  updateNode(id: string, updates: Partial<NodeData>): FlowNode | undefined {
    const node = this._nodes.get(id);
    if (node) {
      const prev = node.clone();
      Object.assign(node, updates);
      this.emitChange({
        type: 'node:update',
        target: node,
        previousValue: prev,
        newValue: node,
      });
    }
    return node;
  }

  /**
   * Remove a node and its connected edges
   */
  removeNode(id: string): boolean {
    const node = this._nodes.get(id);
    if (!node) return false;

    this.beginBatch();

    // Remove connected edges
    for (const edge of this._edges.values()) {
      if (edge.source === id || edge.target === id) {
        this._edges.delete(edge.id);
        this.emitChange({
          type: 'edge:remove',
          target: edge,
          previousValue: edge,
        });
      }
    }

    // Remove from subgraphs
    for (const subGraph of this._subGraphs.values()) {
      subGraph.removeNode(id);
    }

    // Remove the node
    this._nodes.delete(id);
    this.emitChange({ type: 'node:remove', target: node, previousValue: node });

    this.endBatch();
    return true;
  }

  // ============ Edge Operations ============

  /**
   * Generate a unique edge ID
   */
  private generateEdgeId(): string {
    return `edge-${++this._edgeCounter}`;
  }

  /**
   * Add a new edge to the model
   */
  addEdge(data: Omit<EdgeData, 'id'> & { id?: string }): FlowEdge {
    const id = data.id || this.generateEdgeId();
    if (this._edges.has(id)) {
      throw new Error(`Edge with id "${id}" already exists`);
    }

    // Validate source and target exist
    if (!this._nodes.has(data.source)) {
      throw new Error(`Source node "${data.source}" does not exist`);
    }
    if (!this._nodes.has(data.target)) {
      throw new Error(`Target node "${data.target}" does not exist`);
    }

    const edge = new FlowEdge({ ...data, id });
    this._edges.set(edge.id, edge);
    this.emitChange({ type: 'edge:add', target: edge, newValue: edge });
    return edge;
  }

  /**
   * Get an edge by ID
   */
  getEdge(id: string): FlowEdge | undefined {
    return this._edges.get(id);
  }

  /**
   * Get all edges connected to a node
   */
  getEdgesForNode(nodeId: string): FlowEdge[] {
    return this.edges.filter(
      (e) => e.source === nodeId || e.target === nodeId
    );
  }

  /**
   * Update an existing edge
   */
  updateEdge(id: string, updates: Partial<EdgeData>): FlowEdge | undefined {
    const edge = this._edges.get(id);
    if (edge) {
      const prev = edge.clone();
      Object.assign(edge, updates);
      this.emitChange({
        type: 'edge:update',
        target: edge,
        previousValue: prev,
        newValue: edge,
      });
    }
    return edge;
  }

  /**
   * Remove an edge
   */
  removeEdge(id: string): boolean {
    const edge = this._edges.get(id);
    if (!edge) return false;

    this._edges.delete(id);
    this.emitChange({ type: 'edge:remove', target: edge, previousValue: edge });
    return true;
  }

  // ============ SubGraph Operations ============

  /**
   * Add a new subgraph
   */
  addSubGraph(data: SubGraphData): FlowSubGraph {
    if (this._subGraphs.has(data.id)) {
      throw new Error(`SubGraph with id "${data.id}" already exists`);
    }
    const subGraph = new FlowSubGraph(data);
    this._subGraphs.set(subGraph.id, subGraph);
    this.emitChange({
      type: 'subgraph:add',
      target: subGraph,
      newValue: subGraph,
    });
    return subGraph;
  }

  /**
   * Get a subgraph by ID
   */
  getSubGraph(id: string): FlowSubGraph | undefined {
    return this._subGraphs.get(id);
  }

  /**
   * Update an existing subgraph
   */
  updateSubGraph(
    id: string,
    updates: Partial<SubGraphData>
  ): FlowSubGraph | undefined {
    const subGraph = this._subGraphs.get(id);
    if (subGraph) {
      const prev = subGraph.clone();
      Object.assign(subGraph, updates);
      this.emitChange({
        type: 'subgraph:update',
        target: subGraph,
        previousValue: prev,
        newValue: subGraph,
      });
    }
    return subGraph;
  }

  /**
   * Remove a subgraph (nodes remain)
   */
  removeSubGraph(id: string): boolean {
    const subGraph = this._subGraphs.get(id);
    if (!subGraph) return false;

    this._subGraphs.delete(id);
    this.emitChange({
      type: 'subgraph:remove',
      target: subGraph,
      previousValue: subGraph,
    });
    return true;
  }

  // ============ Class Definitions ============

  /**
   * Define a CSS class for styling
   */
  defineClass(
    name: string,
    styles: string[],
    textStyles: string[] = []
  ): void {
    this._classDefs.set(name, { styles, textStyles });
  }

  /**
   * Get a class definition
   */
  getClassDef(
    name: string
  ): { styles: string[]; textStyles: string[] } | undefined {
    return this._classDefs.get(name);
  }

  // ============ Batch Updates ============

  /**
   * Begin a batch update (changes are collected, single event emitted at end)
   */
  beginBatch(): void {
    this._batchDepth++;
  }

  /**
   * End a batch update
   */
  endBatch(): void {
    if (this._batchDepth > 0) {
      this._batchDepth--;
      if (this._batchDepth === 0 && this._batchChanges.length > 0) {
        this.emit({ type: 'batch', newValue: this._batchChanges });
        this._batchChanges = [];
      }
    }
  }

  /**
   * Emit a change event (or collect if in batch mode)
   */
  private emitChange(event: ModelChangeEvent): void {
    if (this._batchDepth > 0) {
      this._batchChanges.push(event);
    } else {
      this.emit(event);
    }
  }

  // ============ Serialization ============

  /**
   * Export model to plain data object
   */
  toData(): FlowchartData {
    const classDefs: Record<string, { styles: string[]; textStyles: string[] }> =
      {};
    for (const [name, def] of this._classDefs) {
      classDefs[name] = { ...def };
    }

    return {
      direction: this._direction,
      nodes: this.nodes.map((n) => n.toData()),
      edges: this.edges.map((e) => e.toData()),
      subGraphs: this.subGraphs.map((s) => s.toData()),
      classDefs: Object.keys(classDefs).length > 0 ? classDefs : undefined,
    };
  }

  /**
   * Create a model from plain data
   */
  static fromData(data: FlowchartData): FlowchartModel {
    const model = new FlowchartModel();
    model._direction = data.direction;

    // Add nodes first
    for (const nodeData of data.nodes) {
      model._nodes.set(nodeData.id, new FlowNode(nodeData));
    }

    // Then edges
    for (const edgeData of data.edges) {
      model._edges.set(edgeData.id, new FlowEdge(edgeData));
    }

    // Then subgraphs
    for (const subGraphData of data.subGraphs) {
      model._subGraphs.set(subGraphData.id, new FlowSubGraph(subGraphData));
    }

    // Class definitions
    if (data.classDefs) {
      for (const [name, def] of Object.entries(data.classDefs)) {
        model._classDefs.set(name, { ...def });
      }
    }

    return model;
  }

  /**
   * Clear all data from the model
   */
  clear(): void {
    this.beginBatch();
    this._nodes.clear();
    this._edges.clear();
    this._subGraphs.clear();
    this._classDefs.clear();
    this._direction = 'TB';
    this._edgeCounter = 0;
    this.endBatch();
  }

  /**
   * Create a deep copy of this model
   */
  clone(): FlowchartModel {
    return FlowchartModel.fromData(this.toData());
  }
}
