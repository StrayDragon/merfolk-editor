export type PortPosition = 'top' | 'right' | 'bottom' | 'left';

export interface Port {
  id: string;
  nodeId: string;
  position: PortPosition;
  x: number;
  y: number;
}

export interface NodeBounds {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Manages connection ports for nodes
 */
export class PortManager {
  private ports: Map<string, Port[]> = new Map();

  /**
   * Update ports for a node based on its bounds
   */
  updatePortsForNode(node: NodeBounds): void {
    const ports: Port[] = [
      {
        id: `${node.id}-top`,
        nodeId: node.id,
        position: 'top',
        x: node.x,
        y: node.y - node.height / 2,
      },
      {
        id: `${node.id}-right`,
        nodeId: node.id,
        position: 'right',
        x: node.x + node.width / 2,
        y: node.y,
      },
      {
        id: `${node.id}-bottom`,
        nodeId: node.id,
        position: 'bottom',
        x: node.x,
        y: node.y + node.height / 2,
      },
      {
        id: `${node.id}-left`,
        nodeId: node.id,
        position: 'left',
        x: node.x - node.width / 2,
        y: node.y,
      },
    ];

    this.ports.set(node.id, ports);
  }

  /**
   * Get all ports for a node
   */
  getPortsForNode(nodeId: string): Port[] {
    return this.ports.get(nodeId) ?? [];
  }

  /**
   * Get a specific port by ID
   */
  getPort(portId: string): Port | undefined {
    for (const ports of this.ports.values()) {
      const port = ports.find((p) => p.id === portId);
      if (port) return port;
    }
    return undefined;
  }

  /**
   * Find the nearest port to a point
   * @param x X coordinate
   * @param y Y coordinate
   * @param excludeNodeId Optional node ID to exclude (to prevent self-connections)
   * @param maxDistance Maximum distance to consider
   */
  findNearestPort(
    x: number,
    y: number,
    excludeNodeId?: string,
    maxDistance: number = 50
  ): Port | null {
    let nearest: Port | null = null;
    let minDist = maxDistance;

    for (const [nodeId, ports] of this.ports) {
      if (nodeId === excludeNodeId) continue;

      for (const port of ports) {
        const dist = Math.hypot(port.x - x, port.y - y);
        if (dist < minDist) {
          minDist = dist;
          nearest = port;
        }
      }
    }

    return nearest;
  }

  /**
   * Find the best port on a node for connecting from a source point
   */
  findBestPort(
    nodeId: string,
    fromX: number,
    fromY: number
  ): Port | null {
    const ports = this.getPortsForNode(nodeId);
    if (ports.length === 0) return null;

    let best: Port | null = null;
    let minDist = Infinity;

    for (const port of ports) {
      const dist = Math.hypot(port.x - fromX, port.y - fromY);
      if (dist < minDist) {
        minDist = dist;
        best = port;
      }
    }

    return best;
  }

  /**
   * Clear ports for a node
   */
  clearNode(nodeId: string): void {
    this.ports.delete(nodeId);
  }

  /**
   * Clear all ports
   */
  clear(): void {
    this.ports.clear();
  }

  /**
   * Get all ports
   */
  getAllPorts(): Port[] {
    const result: Port[] = [];
    for (const ports of this.ports.values()) {
      result.push(...ports);
    }
    return result;
  }
}

