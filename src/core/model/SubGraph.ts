import type { Direction } from './types';

/**
 * Data interface for creating/updating subgraphs
 */
export interface SubGraphData {
  id: string;
  title: string;
  nodeIds: string[];
  parentId?: string;
  direction?: Direction;
  cssClasses?: string[];
}

/**
 * Flowchart subgraph (cluster) model
 */
export class FlowSubGraph implements SubGraphData {
  readonly id: string;
  title: string;
  nodeIds: string[];
  parentId?: string;
  direction?: Direction;
  cssClasses: string[];

  constructor(data: SubGraphData) {
    this.id = data.id;
    this.title = data.title;
    this.nodeIds = [...data.nodeIds];
    this.parentId = data.parentId;
    this.direction = data.direction;
    this.cssClasses = data.cssClasses ? [...data.cssClasses] : [];
  }

  /**
   * Add a node to this subgraph
   */
  addNode(nodeId: string): boolean {
    if (!this.nodeIds.includes(nodeId)) {
      this.nodeIds.push(nodeId);
      return true;
    }
    return false;
  }

  /**
   * Remove a node from this subgraph
   */
  removeNode(nodeId: string): boolean {
    const index = this.nodeIds.indexOf(nodeId);
    if (index !== -1) {
      this.nodeIds.splice(index, 1);
      return true;
    }
    return false;
  }

  /**
   * Check if a node belongs to this subgraph
   */
  hasNode(nodeId: string): boolean {
    return this.nodeIds.includes(nodeId);
  }

  /**
   * Create a deep copy of this subgraph
   */
  clone(): FlowSubGraph {
    return new FlowSubGraph({
      id: this.id,
      title: this.title,
      nodeIds: [...this.nodeIds],
      parentId: this.parentId,
      direction: this.direction,
      cssClasses: [...this.cssClasses],
    });
  }

  /**
   * Convert to plain data object
   */
  toData(): SubGraphData {
    return {
      id: this.id,
      title: this.title,
      nodeIds: [...this.nodeIds],
      parentId: this.parentId,
      direction: this.direction,
      cssClasses: [...this.cssClasses],
    };
  }
}
