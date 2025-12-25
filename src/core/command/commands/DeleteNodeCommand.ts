import type { Command } from '../Command';
import type { FlowchartModel } from '../../model/FlowchartModel';
import type { NodeData } from '../../model/Node';
import type { EdgeData } from '../../model/Edge';

/**
 * Command to delete a node and its connected edges
 */
export class DeleteNodeCommand implements Command {
  readonly description: string;
  private nodeData: NodeData | null = null;
  private connectedEdges: EdgeData[] = [];

  constructor(
    private readonly model: FlowchartModel,
    private readonly nodeId: string
  ) {
    this.description = `Delete node "${nodeId}"`;
  }

  execute(): void {
    const node = this.model.getNode(this.nodeId);
    if (!node) return;

    // Store node data for undo
    this.nodeData = node.toData();

    // Store connected edges for undo
    this.connectedEdges = this.model
      .getEdgesForNode(this.nodeId)
      .map((e) => e.toData());

    // Remove node (this also removes connected edges)
    this.model.removeNode(this.nodeId);
  }

  undo(): void {
    if (!this.nodeData) return;

    // Restore node
    this.model.addNode(this.nodeData);

    // Restore edges
    for (const edgeData of this.connectedEdges) {
      // Only restore if both source and target exist
      if (
        this.model.hasNode(edgeData.source) &&
        this.model.hasNode(edgeData.target)
      ) {
        this.model.addEdge(edgeData);
      }
    }
  }
}

