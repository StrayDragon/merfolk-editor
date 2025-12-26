/**
 * Represents a point in 2D space
 */
export interface Point {
  x: number;
  y: number;
}

/**
 * Represents the bounds of a node
 */
export interface NodeBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * State for drag-and-drop edge creation
 */
export interface DragEdgeStateData {
  isActive: boolean;
  sourceNodeId: string;
  sourcePoint: Point;
  currentPoint: Point;
  hoverTargetId: string | null;
}

/**
 * Manages the state of drag-and-drop edge creation
 */
export class DragEdgeState {
  private _state: DragEdgeStateData = {
    isActive: false,
    sourceNodeId: '',
    sourcePoint: { x: 0, y: 0 },
    currentPoint: { x: 0, y: 0 },
    hoverTargetId: null,
  };

  /**
   * Start dragging from a node
   * @param nodeId - Source node ID
   * @param bounds - Node bounds in SVG coordinates
   */
  startDrag(nodeId: string, bounds: NodeBounds): void {
    // Start from bottom center of the node
    const sourceX = bounds.x + bounds.width / 2;
    const sourceY = bounds.y + bounds.height;

    this._state = {
      isActive: true,
      sourceNodeId: nodeId,
      sourcePoint: { x: sourceX, y: sourceY },
      currentPoint: { x: sourceX, y: sourceY },
      hoverTargetId: null,
    };
  }

  /**
   * Update the current drag position and detect hover target
   * @param point - Current mouse position in SVG coordinates
   * @param nodeBoundsMap - Map of node IDs to their bounds
   * @param tolerance - Additional pixels around nodes for hit detection
   */
  updateDrag(
    point: Point,
    nodeBoundsMap: Map<string, NodeBounds>,
    tolerance: number = 10
  ): void {
    if (!this._state.isActive) return;

    this._state.currentPoint = { x: point.x, y: point.y };

    // Detect hover target
    let hoveredNodeId: string | null = null;
    for (const [id, bounds] of nodeBoundsMap) {
      if (id === this._state.sourceNodeId) continue;

      if (
        point.x >= bounds.x - tolerance &&
        point.x <= bounds.x + bounds.width + tolerance &&
        point.y >= bounds.y - tolerance &&
        point.y <= bounds.y + bounds.height + tolerance
      ) {
        hoveredNodeId = id;
        break;
      }
    }

    this._state.hoverTargetId = hoveredNodeId;
  }

  /**
   * Complete the drag operation
   * @returns Edge data if a valid target was found, null otherwise
   */
  endDrag(): { sourceNodeId: string; targetNodeId: string } | null {
    if (!this._state.isActive) return null;

    const { sourceNodeId, hoverTargetId } = this._state;
    this.cancel();

    if (hoverTargetId && hoverTargetId !== sourceNodeId) {
      return { sourceNodeId, targetNodeId: hoverTargetId };
    }

    return null;
  }

  /**
   * Cancel the drag operation
   */
  cancel(): void {
    this._state = {
      isActive: false,
      sourceNodeId: '',
      sourcePoint: { x: 0, y: 0 },
      currentPoint: { x: 0, y: 0 },
      hoverTargetId: null,
    };
  }

  /**
   * Get the current state
   */
  get state(): Readonly<DragEdgeStateData> {
    return this._state;
  }

  /**
   * Check if drag is active
   */
  get isActive(): boolean {
    return this._state.isActive;
  }

  /**
   * Get the source node ID
   */
  get sourceNodeId(): string {
    return this._state.sourceNodeId;
  }

  /**
   * Get the source point
   */
  get sourcePoint(): Point {
    return this._state.sourcePoint;
  }

  /**
   * Get the current point
   */
  get currentPoint(): Point {
    return this._state.currentPoint;
  }

  /**
   * Get the hover target ID
   */
  get hoverTargetId(): string | null {
    return this._state.hoverTargetId;
  }
}

