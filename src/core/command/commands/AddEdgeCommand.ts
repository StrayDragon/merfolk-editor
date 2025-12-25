import type { Command } from '../Command';
import type { FlowchartModel } from '../../model/FlowchartModel';
import type { EdgeData } from '../../model/Edge';

/**
 * Command to add an edge to the model
 */
export class AddEdgeCommand implements Command {
  readonly description: string;
  private createdEdgeId: string | null = null;

  constructor(
    private readonly model: FlowchartModel,
    private readonly data: Omit<EdgeData, 'id'> & { id?: string }
  ) {
    this.description = `Add edge from "${data.source}" to "${data.target}"`;
  }

  execute(): void {
    const edge = this.model.addEdge(this.data);
    this.createdEdgeId = edge.id;
  }

  undo(): void {
    if (this.createdEdgeId) {
      this.model.removeEdge(this.createdEdgeId);
    }
  }
}

