import { describe, it, expect, beforeEach } from 'vitest';
import { FlowchartModel } from './FlowchartModel';
import type { NodeData } from './Node';
import type { EdgeData } from './Edge';

describe('FlowchartModel', () => {
  let model: FlowchartModel;

  beforeEach(() => {
    model = new FlowchartModel();
  });

  describe('Node Operations', () => {
    it('should add nodes', () => {
      const nodeData: NodeData = {
        id: 'test-node',
        text: 'Test Node',
        shape: 'rect'
      };

      const node = model.addNode(nodeData);
      expect(node.id).toBe('test-node');
      expect(node.text).toBe('Test Node');
      expect(model.getNode('test-node')).toBe(node);
      expect(model.nodes).toHaveLength(1);
    });

    it('should update nodes', () => {
      model.addNode({ id: 'test', text: 'Original', shape: 'rect' });

      const updated = model.updateNode('test', { text: 'Updated' });
      expect(updated?.text).toBe('Updated');
      expect(model.getNode('test')?.text).toBe('Updated');
    });

    it('should remove nodes', () => {
      model.addNode({ id: 'test', text: 'Test', shape: 'rect' });
      expect(model.nodes).toHaveLength(1);

      model.removeNode('test');
      expect(model.nodes).toHaveLength(0);
      expect(model.getNode('test')).toBeUndefined();
    });
  });

  describe('Edge Operations', () => {
    beforeEach(() => {
      // Add test nodes for edges
      model.addNode({ id: 'A', text: 'Node A', shape: 'rect' });
      model.addNode({ id: 'B', text: 'Node B', shape: 'rect' });
    });

    it('should add edges with custom IDs', () => {
      const edgeData: EdgeData = {
        id: 'custom-edge',
        source: 'A',
        target: 'B',
        stroke: 'normal',
        arrowStart: 'none',
        arrowEnd: 'arrow'
      };

      const edge = model.addEdge(edgeData);
      expect(edge.id).toBe('custom-edge');
      expect(model.edges).toHaveLength(1);
    });

    it('should handle duplicate edge IDs by adding suffix', () => {
      // Add first edge with custom ID
      model.addEdge({
        id: 'edge-test',
        source: 'A',
        target: 'B',
        stroke: 'normal',
        arrowStart: 'none',
        arrowEnd: 'arrow'
      });

      // Add second edge with same ID
      const duplicateEdge = model.addEdge({
        id: 'edge-test',
        source: 'A',
        target: 'B',
        stroke: 'normal',
        arrowStart: 'none',
        arrowEnd: 'arrow'
      });

      expect(duplicateEdge.id).toBe('edge-test-dup1');
      expect(model.edges).toHaveLength(2);
    });

    it('should generate unique IDs for edges without custom IDs', () => {
      const edge1 = model.addEdge({
        source: 'A',
        target: 'B',
        stroke: 'normal',
        arrowStart: 'none',
        arrowEnd: 'arrow'
      });

      const edge2 = model.addEdge({
        source: 'A',
        target: 'B',
        stroke: 'normal',
        arrowStart: 'none',
        arrowEnd: 'arrow'
      });

      expect(edge1.id).not.toBe(edge2.id);
      expect(edge1.id).toMatch(/^edge-\d+$/);
      expect(edge2.id).toMatch(/^edge-\d+$/);
    });

    it('should get edges for a node', () => {
      model.addEdge({ source: 'A', target: 'B', stroke: 'normal', arrowStart: 'none', arrowEnd: 'arrow' });
      model.addEdge({ source: 'B', target: 'A', stroke: 'normal', arrowStart: 'none', arrowEnd: 'arrow' });

      const edgesForA = model.getEdgesForNode('A');
      expect(edgesForA).toHaveLength(2);
    });

    it('should remove edges', () => {
      const edge = model.addEdge({
        source: 'A',
        target: 'B',
        stroke: 'normal',
        arrowStart: 'none',
        arrowEnd: 'arrow'
      });
      expect(model.edges).toHaveLength(1);

      model.removeEdge(edge.id);
      expect(model.edges).toHaveLength(0);
    });
  });

  describe('Change Events', () => {
    it('should emit node add events', () => {
      const events: any[] = [];
      model.on((event) => events.push(event));

      const node = model.addNode({ id: 'test', text: 'Test', shape: 'rect' });

      expect(events).toHaveLength(1);
      expect(events[0].type).toBe('node:add');
      expect(events[0].target).toBe(node);
    });

    it('should emit edge add events', () => {
      model.addNode({ id: 'A', text: 'Node A', shape: 'rect' });
      model.addNode({ id: 'B', text: 'Node B', shape: 'rect' });

      const events: any[] = [];
      model.on((event) => events.push(event));

      const edge = model.addEdge({
        source: 'A',
        target: 'B',
        stroke: 'normal',
        arrowStart: 'none',
        arrowEnd: 'arrow'
      });

      expect(events).toHaveLength(1);
      expect(events[0].type).toBe('edge:add');
      expect(events[0].target).toBe(edge);
    });
  });
});
