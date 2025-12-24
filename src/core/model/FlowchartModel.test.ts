import { describe, it, expect, vi } from 'vitest';
import { FlowchartModel } from './FlowchartModel';
import type { NodeData } from './Node';

describe('FlowchartModel', () => {

  describe('node operations', () => {
    it('should add a node', () => {
      const model = new FlowchartModel();
      const nodeData: NodeData = {
        id: 'A',
        text: 'Node A',
        shape: 'rect'
      };

      const node = model.addNode(nodeData);

      expect(node.id).toBe('A');
      expect(node.text).toBe('Node A');
      expect(node.shape).toBe('rect');
      expect(model.nodeCount).toBe(1);
    });

    it('should get a node by ID', () => {
      const model = new FlowchartModel();
      model.addNode({ id: 'A', text: 'Node A', shape: 'rect' });

      const node = model.getNode('A');

      expect(node).toBeDefined();
      expect(node?.id).toBe('A');
      expect(model.getNode('B')).toBeUndefined();
    });

    it('should update a node', () => {
      const model = new FlowchartModel();
      model.addNode({ id: 'A', text: 'Node A', shape: 'rect' });

      const updated = model.updateNode('A', { text: 'Updated A' });

      expect(updated?.text).toBe('Updated A');
      expect(model.getNode('A')?.text).toBe('Updated A');
    });

    it('should remove a node and its connected edges', () => {
      const model = new FlowchartModel();
      model.addNode({ id: 'A', text: 'Node A', shape: 'rect' });
      model.addNode({ id: 'B', text: 'Node B', shape: 'rect' });
      model.addEdge({ source: 'A', target: 'B', stroke: 'normal', arrowStart: 'none', arrowEnd: 'arrow' });

      expect(model.edgeCount).toBe(1);

      const removed = model.removeNode('A');

      expect(removed).toBe(true);
      expect(model.getNode('A')).toBeUndefined();
      expect(model.edgeCount).toBe(0);
    });

    it('should throw when adding duplicate node ID', () => {
      const model = new FlowchartModel();
      model.addNode({ id: 'A', text: 'Node A', shape: 'rect' });

      expect(() => {
        model.addNode({ id: 'A', text: 'Duplicate', shape: 'rect' });
      }).toThrow('Node with id "A" already exists');
    });
  });

  describe('edge operations', () => {
    it('should add an edge', () => {
      const model = new FlowchartModel();
      model.addNode({ id: 'A', text: 'A', shape: 'rect' });
      model.addNode({ id: 'B', text: 'B', shape: 'rect' });

      const edge = model.addEdge({
        source: 'A',
        target: 'B',
        stroke: 'normal',
        arrowStart: 'none',
        arrowEnd: 'arrow'
      });

      expect(edge.source).toBe('A');
      expect(edge.target).toBe('B');
      expect(model.edgeCount).toBe(1);
    });

    it('should get edges for a node', () => {
      const model = new FlowchartModel();
      model.addNode({ id: 'A', text: 'A', shape: 'rect' });
      model.addNode({ id: 'B', text: 'B', shape: 'rect' });
      model.addNode({ id: 'C', text: 'C', shape: 'rect' });
      model.addEdge({ source: 'A', target: 'B', stroke: 'normal', arrowStart: 'none', arrowEnd: 'arrow' });
      model.addEdge({ source: 'B', target: 'C', stroke: 'normal', arrowStart: 'none', arrowEnd: 'arrow' });

      const edgesForB = model.getEdgesForNode('B');

      expect(edgesForB.length).toBe(2);
    });

    it('should update an edge', () => {
      const model = new FlowchartModel();
      model.addNode({ id: 'A', text: 'A', shape: 'rect' });
      model.addNode({ id: 'B', text: 'B', shape: 'rect' });
      const edge = model.addEdge({ source: 'A', target: 'B', stroke: 'normal', arrowStart: 'none', arrowEnd: 'arrow' });

      model.updateEdge(edge.id, { text: 'Updated label' });

      expect(model.getEdge(edge.id)?.text).toBe('Updated label');
    });

    it('should remove an edge', () => {
      const model = new FlowchartModel();
      model.addNode({ id: 'A', text: 'A', shape: 'rect' });
      model.addNode({ id: 'B', text: 'B', shape: 'rect' });
      const edge = model.addEdge({ source: 'A', target: 'B', stroke: 'normal', arrowStart: 'none', arrowEnd: 'arrow' });

      const removed = model.removeEdge(edge.id);

      expect(removed).toBe(true);
      expect(model.edgeCount).toBe(0);
    });

    it('should generate unique edge IDs', () => {
      const model = new FlowchartModel();
      model.addNode({ id: 'A', text: 'A', shape: 'rect' });
      model.addNode({ id: 'B', text: 'B', shape: 'rect' });

      const edge1 = model.addEdge({ source: 'A', target: 'B', stroke: 'normal', arrowStart: 'none', arrowEnd: 'arrow' });
      const edge2 = model.addEdge({ source: 'A', target: 'B', stroke: 'normal', arrowStart: 'none', arrowEnd: 'arrow' });

      expect(edge1.id).not.toBe(edge2.id);
    });

    it('should throw when adding edge with non-existent source/target', () => {
      const model = new FlowchartModel();
      model.addNode({ id: 'A', text: 'A', shape: 'rect' });

      expect(() => {
        model.addEdge({ source: 'A', target: 'B', stroke: 'normal', arrowStart: 'none', arrowEnd: 'arrow' });
      }).toThrow('Target node "B" does not exist');

      expect(() => {
        model.addEdge({ source: 'X', target: 'A', stroke: 'normal', arrowStart: 'none', arrowEnd: 'arrow' });
      }).toThrow('Source node "X" does not exist');
    });
  });

  describe('subgraph operations', () => {
    it('should add a subgraph', () => {
      const model = new FlowchartModel();

      const subgraph = model.addSubGraph({
        id: 'sg1',
        title: 'Subgraph 1',
        nodeIds: ['A', 'B']
      });

      expect(subgraph.id).toBe('sg1');
      expect(subgraph.title).toBe('Subgraph 1');
    });

    it('should update a subgraph', () => {
      const model = new FlowchartModel();
      model.addSubGraph({ id: 'sg1', title: 'Old Title', nodeIds: [] });

      model.updateSubGraph('sg1', { title: 'New Title' });

      expect(model.getSubGraph('sg1')?.title).toBe('New Title');
    });

    it('should remove a subgraph', () => {
      const model = new FlowchartModel();
      model.addSubGraph({ id: 'sg1', title: 'Subgraph', nodeIds: [] });

      const removed = model.removeSubGraph('sg1');

      expect(removed).toBe(true);
      expect(model.getSubGraph('sg1')).toBeUndefined();
    });
  });

  describe('events', () => {
    it('should emit events on node add', () => {
      const model = new FlowchartModel();
      const listener = vi.fn();
      model.on(listener);

      model.addNode({ id: 'A', text: 'A', shape: 'rect' });

      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'node:add' })
      );
    });

    it('should emit events on node remove', () => {
      const model = new FlowchartModel();
      model.addNode({ id: 'A', text: 'A', shape: 'rect' });

      const listener = vi.fn();
      model.on(listener);

      model.removeNode('A');

      // removeNode uses beginBatch/endBatch internally, so it emits a batch event
      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'batch' })
      );
      // The batch should contain the node:remove event
      const batchCall = listener.mock.calls[0][0];
      expect(batchCall.newValue).toContainEqual(
        expect.objectContaining({ type: 'node:remove' })
      );
    });

    it('should emit batch events', () => {
      const model = new FlowchartModel();
      model.addNode({ id: 'A', text: 'A', shape: 'rect' });
      model.addNode({ id: 'B', text: 'B', shape: 'rect' });
      model.addEdge({ source: 'A', target: 'B', stroke: 'normal', arrowStart: 'none', arrowEnd: 'arrow' });

      const listener = vi.fn();
      model.on(listener);

      model.beginBatch();
      model.removeNode('A'); // This also removes the edge
      model.endBatch();

      // Should emit a single batch event
      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'batch' })
      );
    });
  });

  describe('serialization', () => {
    it('should export to data object', () => {
      const model = new FlowchartModel();
      model.direction = 'LR';
      model.addNode({ id: 'A', text: 'Node A', shape: 'rounded' });
      model.addNode({ id: 'B', text: 'Node B', shape: 'diamond' });
      model.addEdge({ source: 'A', target: 'B', text: 'connects', stroke: 'normal', arrowStart: 'none', arrowEnd: 'arrow' });

      const data = model.toData();

      expect(data.direction).toBe('LR');
      expect(data.nodes).toHaveLength(2);
      expect(data.edges).toHaveLength(1);
      expect(data.nodes[0].id).toBe('A');
    });

    it('should create from data object', () => {
      const data = {
        direction: 'TB' as const,
        nodes: [
          { id: 'X', text: 'X', shape: 'circle' as const },
          { id: 'Y', text: 'Y', shape: 'rect' as const }
        ],
        edges: [
          { id: 'e1', source: 'X', target: 'Y', stroke: 'normal' as const, arrowStart: 'none' as const, arrowEnd: 'arrow' as const }
        ],
        subGraphs: []
      };

      const model = FlowchartModel.fromData(data);

      expect(model.direction).toBe('TB');
      expect(model.nodeCount).toBe(2);
      expect(model.edgeCount).toBe(1);
      expect(model.getNode('X')?.shape).toBe('circle');
    });

    it('should clone correctly', () => {
      const model = new FlowchartModel();
      model.addNode({ id: 'A', text: 'A', shape: 'rect' });
      model.addNode({ id: 'B', text: 'B', shape: 'rect' });
      model.addEdge({ source: 'A', target: 'B', stroke: 'normal', arrowStart: 'none', arrowEnd: 'arrow' });

      const cloned = model.clone();

      // Modify original
      model.updateNode('A', { text: 'Modified' });

      // Clone should be unchanged
      expect(cloned.getNode('A')?.text).toBe('A');
      expect(cloned.nodeCount).toBe(2);
      expect(cloned.edgeCount).toBe(1);
    });
  });
});
