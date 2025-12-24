import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SyncEngine } from './SyncEngine';

describe('SyncEngine', () => {
  let syncEngine: SyncEngine;

  beforeEach(() => {
    syncEngine = new SyncEngine({ debounceDelay: 10 });
    vi.useFakeTimers();
  });

  afterEach(() => {
    syncEngine.destroy();
    vi.useRealTimers();
  });

  describe('updateFromCode', () => {
    it('should parse code and update model', () => {
      const code = `flowchart TB
        A[Node A]
        B[Node B]
        A --> B`;

      const model = syncEngine.updateFromCode(code);

      expect(model.nodeCount).toBe(2);
      expect(model.edgeCount).toBe(1);
      expect(model.getNode('A')?.text).toBe('Node A');
    });

    it('should preserve node positions across updates', () => {
      const code1 = `flowchart TB
        A[Node A]`;

      syncEngine.updateFromCode(code1);
      syncEngine.updateNodePosition('A', 100, 200);

      const code2 = `flowchart TB
        A[Node A]
        B[Node B]`;

      syncEngine.updateFromCode(code2);

      const pos = syncEngine.getNodePosition('A');
      expect(pos).toEqual({ x: 100, y: 200 });
    });

    it('should emit model change events', () => {
      const callback = vi.fn();
      syncEngine.setOnCodeChange(callback);

      syncEngine.updateFromCode(`flowchart TB\n  A[A]`);
      syncEngine.addNode('B', 'Node B');

      vi.advanceTimersByTime(50);

      expect(callback).toHaveBeenCalled();
    });
  });

  describe('updateNodePosition', () => {
    it('should update node position without triggering code change', () => {
      const callback = vi.fn();
      syncEngine.setOnCodeChange(callback);

      syncEngine.updateFromCode(`flowchart TB\n  A[A]`);
      callback.mockClear();

      syncEngine.updateNodePosition('A', 50, 75);
      vi.advanceTimersByTime(500);

      expect(callback).not.toHaveBeenCalled();
    });

    it('should save position for persistence', () => {
      syncEngine.updateFromCode(`flowchart TB\n  A[A]`);
      syncEngine.updateNodePosition('A', 100, 150);

      const positions = syncEngine.exportPositions();

      expect(positions['A']).toEqual({ x: 100, y: 150 });
    });
  });

  describe('removeNode', () => {
    it('should remove node from model', () => {
      syncEngine.updateFromCode(`flowchart TB\n  A[A]\n  B[B]`);

      syncEngine.removeNode('A');

      expect(syncEngine.getModel().getNode('A')).toBeUndefined();
      expect(syncEngine.getModel().nodeCount).toBe(1);
    });

    it('should trigger code change callback', () => {
      const callback = vi.fn();
      syncEngine.setOnCodeChange(callback);

      syncEngine.updateFromCode(`flowchart TB\n  A[A]\n  B[B]`);
      callback.mockClear();

      syncEngine.removeNode('A');
      vi.advanceTimersByTime(50);

      expect(callback).toHaveBeenCalled();
    });

    it('should clean up node positions', () => {
      syncEngine.updateFromCode(`flowchart TB\n  A[A]`);
      syncEngine.updateNodePosition('A', 100, 100);

      syncEngine.removeNode('A');

      expect(syncEngine.getNodePosition('A')).toBeUndefined();
    });
  });

  describe('addNode', () => {
    it('should add node to model', () => {
      syncEngine.updateFromCode(`flowchart TB\n  A[A]`);

      syncEngine.addNode('B', 'Node B', { x: 50, y: 50 });

      expect(syncEngine.getModel().getNode('B')).toBeDefined();
      expect(syncEngine.getModel().getNode('B')?.text).toBe('Node B');
    });

    it('should save position when provided', () => {
      syncEngine.updateFromCode(`flowchart TB\n  A[A]`);

      syncEngine.addNode('B', 'Node B', { x: 200, y: 300 });

      expect(syncEngine.getNodePosition('B')).toEqual({ x: 200, y: 300 });
    });

    it('should support different shapes', () => {
      syncEngine.updateFromCode(`flowchart TB\n  A[A]`);

      syncEngine.addNode('B', 'Node B', undefined, 'diamond');

      expect(syncEngine.getNodeShape('B')).toBe('diamond');
    });
  });

  describe('addEdge', () => {
    it('should add edge between nodes', () => {
      syncEngine.updateFromCode(`flowchart TB\n  A[A]\n  B[B]`);

      syncEngine.addEdge('A', 'B', 'connects');

      expect(syncEngine.getModel().edgeCount).toBe(1);
    });

    it('should support different stroke types', () => {
      syncEngine.updateFromCode(`flowchart TB\n  A[A]\n  B[B]`);

      syncEngine.addEdge('A', 'B', undefined, 'dotted');

      const edges = syncEngine.getModel().edges;
      expect(edges[0].stroke).toBe('dotted');
    });
  });

  describe('undo/redo', () => {
    it('should undo node addition', () => {
      syncEngine.updateFromCode(`flowchart TB\n  A[A]`);
      syncEngine.addNode('B', 'Node B');

      expect(syncEngine.getModel().nodeCount).toBe(2);

      syncEngine.undo();

      expect(syncEngine.getModel().nodeCount).toBe(1);
      expect(syncEngine.getModel().getNode('B')).toBeUndefined();
    });

    it('should redo after undo', () => {
      syncEngine.updateFromCode(`flowchart TB\n  A[A]`);
      syncEngine.addNode('B', 'Node B');
      syncEngine.undo();

      expect(syncEngine.getModel().nodeCount).toBe(1);

      syncEngine.redo();

      expect(syncEngine.getModel().nodeCount).toBe(2);
      expect(syncEngine.getModel().getNode('B')).toBeDefined();
    });

    it('should report canUndo/canRedo correctly', () => {
      syncEngine.updateFromCode(`flowchart TB\n  A[A]`);

      expect(syncEngine.canUndo()).toBe(false);
      expect(syncEngine.canRedo()).toBe(false);

      syncEngine.addNode('B', 'B');

      expect(syncEngine.canUndo()).toBe(true);
      expect(syncEngine.canRedo()).toBe(false);

      syncEngine.undo();

      expect(syncEngine.canUndo()).toBe(false);
      expect(syncEngine.canRedo()).toBe(true);
    });

    it('should clear redo stack on new action', () => {
      syncEngine.updateFromCode(`flowchart TB\n  A[A]`);
      syncEngine.addNode('B', 'B');
      syncEngine.undo();

      expect(syncEngine.canRedo()).toBe(true);

      syncEngine.addNode('C', 'C');

      expect(syncEngine.canRedo()).toBe(false);
    });
  });

  describe('position management', () => {
    it('should export positions correctly', () => {
      syncEngine.updateFromCode(`flowchart TB\n  A[A]\n  B[B]`);
      syncEngine.updateNodePosition('A', 10, 20);
      syncEngine.updateNodePosition('B', 30, 40);

      const exported = syncEngine.exportPositions();

      expect(exported).toEqual({
        'A': { x: 10, y: 20 },
        'B': { x: 30, y: 40 }
      });
    });

    it('should import positions correctly', () => {
      syncEngine.updateFromCode(`flowchart TB\n  A[A]\n  B[B]`);

      syncEngine.importPositions({
        'A': { x: 100, y: 200 },
        'B': { x: 300, y: 400 }
      });

      expect(syncEngine.getNodePosition('A')).toEqual({ x: 100, y: 200 });
      expect(syncEngine.getNodePosition('B')).toEqual({ x: 300, y: 400 });
    });

    it('should get individual node position', () => {
      syncEngine.updateFromCode(`flowchart TB\n  A[A]`);
      syncEngine.updateNodePosition('A', 55, 66);

      expect(syncEngine.getNodePosition('A')).toEqual({ x: 55, y: 66 });
      expect(syncEngine.getNodePosition('X')).toBeUndefined();
    });
  });

  describe('code generation', () => {
    it('should generate valid Mermaid code from model', () => {
      syncEngine.updateFromCode(`flowchart TB\n  A[A]`);
      syncEngine.addNode('B', 'Node B');
      syncEngine.addEdge('A', 'B', 'test');

      const code = syncEngine.getCode();

      expect(code).toContain('flowchart');
      expect(code).toContain('A');
      expect(code).toContain('B');
    });

    it('should debounce code change callbacks', () => {
      const callback = vi.fn();
      syncEngine.setOnCodeChange(callback);

      syncEngine.updateFromCode(`flowchart TB\n  A[A]`);

      // Multiple rapid changes
      syncEngine.addNode('B', 'B');
      syncEngine.addNode('C', 'C');
      syncEngine.addNode('D', 'D');

      // Before debounce timeout
      expect(callback).not.toHaveBeenCalled();

      vi.advanceTimersByTime(50);

      // Should only be called once for all changes
      expect(callback).toHaveBeenCalledTimes(1);
    });
  });

  describe('lifecycle', () => {
    it('should clean up timers on destroy', () => {
      const callback = vi.fn();
      syncEngine.setOnCodeChange(callback);

      syncEngine.updateFromCode(`flowchart TB\n  A[A]`);
      syncEngine.addNode('B', 'B');

      syncEngine.destroy();

      vi.advanceTimersByTime(100);

      // Callback should not be called after destroy
      expect(callback).not.toHaveBeenCalled();
    });
  });
});
