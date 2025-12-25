import type { Command } from '../Command';
import type { FlowchartModel } from '../../model/FlowchartModel';
import type { EdgeData } from '../../model/Edge';

/**
 * Command to delete an edge
 */
export class DeleteEdgeCommand implements Command {
  readonly description: string;
  private edgeData: EdgeData | null = null;

  constructor(
    private readonly model: FlowchartModel,
    private readonly edgeId: string
  ) {
    this.description = `Delete edge "${edgeId}"`;
  }

  execute(): void {
    const edge = this.model.getEdge(this.edgeId);
    if (!edge) return;

    // Store edge data for undo
    this.edgeData = edge.toData();
    this.model.removeEdge(this.edgeId);
  }

  undo(): void {
    if (!this.edgeData) return;

    // Only restore if both nodes exist
    if (
      this.model.hasNode(this.edgeData.source) &&
      this.model.hasNode(this.edgeData.target)
    ) {
      this.model.addEdge(this.edgeData);
    }
  }
}

