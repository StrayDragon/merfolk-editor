import type { Command } from '../Command';
import type { FlowchartModel } from '../../model/FlowchartModel';

export interface NodeMove {
  id: string;
  from: { x: number; y: number };
  to: { x: number; y: number };
}

/**
 * Command to move one or more nodes
 */
export class MoveNodesCommand implements Command {
  readonly description: string;

  constructor(
    private readonly model: FlowchartModel,
    private readonly moves: NodeMove[]
  ) {
    const count = moves.length;
    this.description =
      count === 1 ? `Move node "${moves[0].id}"` : `Move ${count} nodes`;
  }

  execute(): void {
    for (const move of this.moves) {
      this.model.updateNode(move.id, { x: move.to.x, y: move.to.y });
    }
  }

  undo(): void {
    for (const move of this.moves) {
      this.model.updateNode(move.id, { x: move.from.x, y: move.from.y });
    }
  }
}

