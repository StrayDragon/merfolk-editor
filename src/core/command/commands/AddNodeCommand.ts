import type { Command } from '../Command';
import type { FlowchartModel } from '../../model/FlowchartModel';
import type { NodeData } from '../../model/Node';

/**
 * Command to add a node to the model
 */
export class AddNodeCommand implements Command {
  readonly description: string;

  constructor(
    private readonly model: FlowchartModel,
    private readonly data: NodeData
  ) {
    this.description = `Add node "${data.id}"`;
  }

  execute(): void {
    if (!this.model.hasNode(this.data.id)) {
      this.model.addNode(this.data);
    }
  }

  undo(): void {
    this.model.removeNode(this.data.id);
  }
}

