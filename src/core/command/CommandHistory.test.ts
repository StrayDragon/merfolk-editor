import { describe, it, expect, beforeEach } from 'vitest';
import { CommandHistory } from './CommandHistory';
import { AddNodeCommand } from './commands/AddNodeCommand';
import { DeleteNodeCommand } from './commands/DeleteNodeCommand';
import { UpdateNodeCommand } from './commands/UpdateNodeCommand';
import { AddEdgeCommand } from './commands/AddEdgeCommand';
import { DeleteEdgeCommand } from './commands/DeleteEdgeCommand';
import { MoveNodesCommand } from './commands/MoveNodesCommand';
import { CompositeCommand } from './Command';
import { FlowchartModel } from '../model/FlowchartModel';

describe('CommandHistory', () => {
  let history: CommandHistory;
  let model: FlowchartModel;

  beforeEach(() => {
    history = new CommandHistory();
    model = new FlowchartModel();
  });

  describe('basic operations', () => {
    it('should execute and add command to undo stack', () => {
      history.execute(
        new AddNodeCommand(model, { id: 'A', text: 'A', shape: 'rect' })
      );

      expect(model.hasNode('A')).toBe(true);
      expect(history.canUndo).toBe(true);
      expect(history.undoCount).toBe(1);
    });

    it('should undo last command', () => {
      history.execute(
        new AddNodeCommand(model, { id: 'A', text: 'A', shape: 'rect' })
      );

      const result = history.undo();

      expect(result).toBe(true);
      expect(model.hasNode('A')).toBe(false);
      expect(history.canUndo).toBe(false);
      expect(history.canRedo).toBe(true);
    });

    it('should redo undone command', () => {
      history.execute(
        new AddNodeCommand(model, { id: 'A', text: 'A', shape: 'rect' })
      );
      history.undo();

      const result = history.redo();

      expect(result).toBe(true);
      expect(model.hasNode('A')).toBe(true);
      expect(history.canRedo).toBe(false);
    });

    it('should clear redo stack on new action', () => {
      history.execute(
        new AddNodeCommand(model, { id: 'A', text: 'A', shape: 'rect' })
      );
      history.undo();
      history.execute(
        new AddNodeCommand(model, { id: 'B', text: 'B', shape: 'rect' })
      );

      expect(history.canRedo).toBe(false);
      expect(model.hasNode('A')).toBe(false);
      expect(model.hasNode('B')).toBe(true);
    });

    it('should return false when nothing to undo', () => {
      expect(history.undo()).toBe(false);
    });

    it('should return false when nothing to redo', () => {
      expect(history.redo()).toBe(false);
    });
  });

  describe('max size limit', () => {
    it('should enforce max size', () => {
      const smallHistory = new CommandHistory(3);

      for (let i = 0; i < 5; i++) {
        smallHistory.execute(
          new AddNodeCommand(model, { id: `N${i}`, text: `N${i}`, shape: 'rect' })
        );
      }

      expect(smallHistory.undoCount).toBe(3);
    });
  });

  describe('clear', () => {
    it('should clear all history', () => {
      history.execute(
        new AddNodeCommand(model, { id: 'A', text: 'A', shape: 'rect' })
      );
      history.undo();

      history.clear();

      expect(history.canUndo).toBe(false);
      expect(history.canRedo).toBe(false);
    });
  });

  describe('descriptions', () => {
    it('should return undo descriptions', () => {
      history.execute(
        new AddNodeCommand(model, { id: 'A', text: 'A', shape: 'rect' })
      );
      history.execute(
        new AddNodeCommand(model, { id: 'B', text: 'B', shape: 'rect' })
      );

      const descriptions = history.getUndoDescriptions();

      expect(descriptions).toContain('Add node "A"');
      expect(descriptions).toContain('Add node "B"');
    });
  });
});

describe('AddNodeCommand', () => {
  let model: FlowchartModel;

  beforeEach(() => {
    model = new FlowchartModel();
  });

  it('should add node on execute', () => {
    const cmd = new AddNodeCommand(model, { id: 'A', text: 'A', shape: 'rect' });

    cmd.execute();

    expect(model.hasNode('A')).toBe(true);
  });

  it('should remove node on undo', () => {
    const cmd = new AddNodeCommand(model, { id: 'A', text: 'A', shape: 'rect' });
    cmd.execute();

    cmd.undo();

    expect(model.hasNode('A')).toBe(false);
  });

  it('should not add duplicate on re-execute', () => {
    const cmd = new AddNodeCommand(model, { id: 'A', text: 'A', shape: 'rect' });
    cmd.execute();
    cmd.undo();
    cmd.execute();

    expect(model.nodeCount).toBe(1);
  });
});

describe('DeleteNodeCommand', () => {
  let model: FlowchartModel;

  beforeEach(() => {
    model = new FlowchartModel();
    model.addNode({ id: 'A', text: 'A', shape: 'rect' });
    model.addNode({ id: 'B', text: 'B', shape: 'rect' });
    model.addEdge({
      id: 'e1',
      source: 'A',
      target: 'B',
      stroke: 'normal',
      arrowStart: 'none',
      arrowEnd: 'arrow',
    });
  });

  it('should delete node and connected edges on execute', () => {
    const cmd = new DeleteNodeCommand(model, 'A');

    cmd.execute();

    expect(model.hasNode('A')).toBe(false);
    expect(model.edgeCount).toBe(0);
  });

  it('should restore node and edges on undo', () => {
    const cmd = new DeleteNodeCommand(model, 'A');
    cmd.execute();

    cmd.undo();

    expect(model.hasNode('A')).toBe(true);
    expect(model.edgeCount).toBe(1);
  });
});

describe('UpdateNodeCommand', () => {
  let model: FlowchartModel;

  beforeEach(() => {
    model = new FlowchartModel();
    model.addNode({ id: 'A', text: 'Original', shape: 'rect' });
  });

  it('should update node on execute', () => {
    const cmd = new UpdateNodeCommand(model, 'A', { text: 'Updated' });

    cmd.execute();

    expect(model.getNode('A')?.text).toBe('Updated');
  });

  it('should restore original value on undo', () => {
    const cmd = new UpdateNodeCommand(model, 'A', { text: 'Updated' });
    cmd.execute();

    cmd.undo();

    expect(model.getNode('A')?.text).toBe('Original');
  });
});

describe('AddEdgeCommand', () => {
  let model: FlowchartModel;

  beforeEach(() => {
    model = new FlowchartModel();
    model.addNode({ id: 'A', text: 'A', shape: 'rect' });
    model.addNode({ id: 'B', text: 'B', shape: 'rect' });
  });

  it('should add edge on execute', () => {
    const cmd = new AddEdgeCommand(model, {
      source: 'A',
      target: 'B',
      stroke: 'normal',
      arrowStart: 'none',
      arrowEnd: 'arrow',
    });

    cmd.execute();

    expect(model.edgeCount).toBe(1);
  });

  it('should remove edge on undo', () => {
    const cmd = new AddEdgeCommand(model, {
      source: 'A',
      target: 'B',
      stroke: 'normal',
      arrowStart: 'none',
      arrowEnd: 'arrow',
    });
    cmd.execute();

    cmd.undo();

    expect(model.edgeCount).toBe(0);
  });
});

describe('DeleteEdgeCommand', () => {
  let model: FlowchartModel;

  beforeEach(() => {
    model = new FlowchartModel();
    model.addNode({ id: 'A', text: 'A', shape: 'rect' });
    model.addNode({ id: 'B', text: 'B', shape: 'rect' });
    model.addEdge({
      id: 'e1',
      source: 'A',
      target: 'B',
      stroke: 'normal',
      arrowStart: 'none',
      arrowEnd: 'arrow',
    });
  });

  it('should delete edge on execute', () => {
    const cmd = new DeleteEdgeCommand(model, 'e1');

    cmd.execute();

    expect(model.edgeCount).toBe(0);
  });

  it('should restore edge on undo', () => {
    const cmd = new DeleteEdgeCommand(model, 'e1');
    cmd.execute();

    cmd.undo();

    expect(model.edgeCount).toBe(1);
  });
});

describe('MoveNodesCommand', () => {
  let model: FlowchartModel;

  beforeEach(() => {
    model = new FlowchartModel();
    model.addNode({ id: 'A', text: 'A', shape: 'rect', x: 0, y: 0 });
    model.addNode({ id: 'B', text: 'B', shape: 'rect', x: 100, y: 100 });
  });

  it('should move nodes on execute', () => {
    const cmd = new MoveNodesCommand(model, [
      { id: 'A', from: { x: 0, y: 0 }, to: { x: 50, y: 50 } },
      { id: 'B', from: { x: 100, y: 100 }, to: { x: 150, y: 150 } },
    ]);

    cmd.execute();

    expect(model.getNode('A')?.x).toBe(50);
    expect(model.getNode('A')?.y).toBe(50);
    expect(model.getNode('B')?.x).toBe(150);
    expect(model.getNode('B')?.y).toBe(150);
  });

  it('should restore positions on undo', () => {
    const cmd = new MoveNodesCommand(model, [
      { id: 'A', from: { x: 0, y: 0 }, to: { x: 50, y: 50 } },
    ]);
    cmd.execute();

    cmd.undo();

    expect(model.getNode('A')?.x).toBe(0);
    expect(model.getNode('A')?.y).toBe(0);
  });
});

describe('CompositeCommand', () => {
  let model: FlowchartModel;

  beforeEach(() => {
    model = new FlowchartModel();
  });

  it('should execute all commands', () => {
    const composite = new CompositeCommand([
      new AddNodeCommand(model, { id: 'A', text: 'A', shape: 'rect' }),
      new AddNodeCommand(model, { id: 'B', text: 'B', shape: 'rect' }),
    ]);

    composite.execute();

    expect(model.nodeCount).toBe(2);
  });

  it('should undo all commands in reverse order', () => {
    const composite = new CompositeCommand([
      new AddNodeCommand(model, { id: 'A', text: 'A', shape: 'rect' }),
      new AddNodeCommand(model, { id: 'B', text: 'B', shape: 'rect' }),
    ]);
    composite.execute();

    composite.undo();

    expect(model.nodeCount).toBe(0);
  });
});

