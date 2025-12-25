import type { Command } from '../Command';
import type { FlowchartModel } from '../../model/FlowchartModel';
import type { NodeData } from '../../model/Node';

/**
 * Command to update node properties
 */
export class UpdateNodeCommand implements Command {
  readonly description: string;
  private previousData: Partial<NodeData> | null = null;

  constructor(
    private readonly model: FlowchartModel,
    private readonly nodeId: string,
    private readonly updates: Partial<NodeData>
  ) {
    this.description = `Update node "${nodeId}"`;
  }

  execute(): void {
    const node = this.model.getNode(this.nodeId);
    if (!node) return;

    // Store previous values for undo
    this.previousData = {};
    for (const key of Object.keys(this.updates) as (keyof NodeData)[]) {
      (this.previousData as Record<string, unknown>)[key] = node[key];
    }

    this.model.updateNode(this.nodeId, this.updates);
  }

  undo(): void {
    if (!this.previousData) return;
    this.model.updateNode(this.nodeId, this.previousData);
  }
}

