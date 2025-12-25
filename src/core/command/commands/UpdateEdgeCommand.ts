import type { Command } from '../Command';
import type { FlowchartModel } from '../../model/FlowchartModel';
import type { EdgeData } from '../../model/Edge';

/**
 * Command to update edge properties
 */
export class UpdateEdgeCommand implements Command {
  readonly description: string;
  private previousData: Partial<EdgeData> | null = null;

  constructor(
    private readonly model: FlowchartModel,
    private readonly edgeId: string,
    private readonly updates: Partial<EdgeData>
  ) {
    this.description = `Update edge "${edgeId}"`;
  }

  execute(): void {
    const edge = this.model.getEdge(this.edgeId);
    if (!edge) return;

    // Store previous values for undo
    this.previousData = {};
    for (const key of Object.keys(this.updates) as (keyof EdgeData)[]) {
      (this.previousData as Record<string, unknown>)[key] = edge[key];
    }

    this.model.updateEdge(this.edgeId, this.updates);
  }

  undo(): void {
    if (!this.previousData) return;
    this.model.updateEdge(this.edgeId, this.previousData);
  }
}

