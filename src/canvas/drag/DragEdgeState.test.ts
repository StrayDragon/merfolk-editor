import { describe, it, expect, beforeEach } from 'vitest';
import { DragEdgeState, type NodeBounds } from './DragEdgeState';

describe('DragEdgeState', () => {
  let state: DragEdgeState;

  const nodeA: NodeBounds = {
    x: 100,
    y: 50,
    width: 80,
    height: 40,
  };

  const nodeB: NodeBounds = {
    x: 250,
    y: 50,
    width: 80,
    height: 40,
  };

  const nodeC: NodeBounds = {
    x: 100,
    y: 150,
    width: 80,
    height: 40,
  };

  const nodeBoundsMap = new Map<string, NodeBounds>([
    ['A', nodeA],
    ['B', nodeB],
    ['C', nodeC],
  ]);

  beforeEach(() => {
    state = new DragEdgeState();
  });

  describe('initial state', () => {
    it('should start inactive', () => {
      expect(state.isActive).toBe(false);
      expect(state.sourceNodeId).toBe('');
      expect(state.hoverTargetId).toBeNull();
    });
  });

  describe('startDrag', () => {
    it('should activate the state', () => {
      state.startDrag('A', nodeA);

      expect(state.isActive).toBe(true);
      expect(state.sourceNodeId).toBe('A');
    });

    it('should set source point to bottom center of node', () => {
      state.startDrag('A', nodeA);

      // Bottom center = (x + width/2, y + height)
      expect(state.sourcePoint).toEqual({
        x: 100 + 80 / 2, // 140
        y: 50 + 40, // 90
      });
    });

    it('should initialize current point to source point', () => {
      state.startDrag('A', nodeA);

      expect(state.currentPoint).toEqual(state.sourcePoint);
    });
  });

  describe('updateDrag', () => {
    beforeEach(() => {
      state.startDrag('A', nodeA);
    });

    it('should update current point', () => {
      state.updateDrag({ x: 200, y: 100 }, nodeBoundsMap);

      expect(state.currentPoint).toEqual({ x: 200, y: 100 });
    });

    it('should keep source point unchanged', () => {
      const originalSource = { ...state.sourcePoint };
      state.updateDrag({ x: 200, y: 100 }, nodeBoundsMap);

      expect(state.sourcePoint).toEqual(originalSource);
    });

    it('should detect hover over target node', () => {
      // Move to center of node B
      state.updateDrag({ x: 290, y: 70 }, nodeBoundsMap);

      expect(state.hoverTargetId).toBe('B');
    });

    it('should detect hover over another target node', () => {
      // Move to center of node C
      state.updateDrag({ x: 140, y: 170 }, nodeBoundsMap);

      expect(state.hoverTargetId).toBe('C');
    });

    it('should not detect hover over source node', () => {
      // Move back to node A area
      state.updateDrag({ x: 140, y: 70 }, nodeBoundsMap);

      expect(state.hoverTargetId).toBeNull();
    });

    it('should clear hover when outside all nodes', () => {
      state.updateDrag({ x: 290, y: 70 }, nodeBoundsMap);
      expect(state.hoverTargetId).toBe('B');

      state.updateDrag({ x: 500, y: 500 }, nodeBoundsMap);
      expect(state.hoverTargetId).toBeNull();
    });

    it('should use tolerance for hit detection', () => {
      // Just outside node B bounds but within tolerance
      state.updateDrag({ x: 245, y: 70 }, nodeBoundsMap, 10);

      expect(state.hoverTargetId).toBe('B');
    });

    it('should not detect when outside tolerance', () => {
      // Just outside node B bounds and tolerance
      state.updateDrag({ x: 235, y: 70 }, nodeBoundsMap, 10);

      expect(state.hoverTargetId).toBeNull();
    });

    it('should do nothing when not active', () => {
      state.cancel();
      state.updateDrag({ x: 200, y: 100 }, nodeBoundsMap);

      expect(state.currentPoint).toEqual({ x: 0, y: 0 });
    });
  });

  describe('endDrag', () => {
    beforeEach(() => {
      state.startDrag('A', nodeA);
    });

    it('should return edge data when hovering valid target', () => {
      state.updateDrag({ x: 290, y: 70 }, nodeBoundsMap);

      const result = state.endDrag();

      expect(result).toEqual({
        sourceNodeId: 'A',
        targetNodeId: 'B',
      });
    });

    it('should reset state after ending', () => {
      state.updateDrag({ x: 290, y: 70 }, nodeBoundsMap);
      state.endDrag();

      expect(state.isActive).toBe(false);
      expect(state.sourceNodeId).toBe('');
      expect(state.hoverTargetId).toBeNull();
    });

    it('should return null when no target is hovered', () => {
      state.updateDrag({ x: 500, y: 500 }, nodeBoundsMap);

      const result = state.endDrag();

      expect(result).toBeNull();
    });

    it('should return null when not active', () => {
      state.cancel();

      const result = state.endDrag();

      expect(result).toBeNull();
    });
  });

  describe('cancel', () => {
    it('should reset all state', () => {
      state.startDrag('A', nodeA);
      state.updateDrag({ x: 290, y: 70 }, nodeBoundsMap);

      state.cancel();

      expect(state.isActive).toBe(false);
      expect(state.sourceNodeId).toBe('');
      expect(state.sourcePoint).toEqual({ x: 0, y: 0 });
      expect(state.currentPoint).toEqual({ x: 0, y: 0 });
      expect(state.hoverTargetId).toBeNull();
    });
  });

  describe('state getter', () => {
    it('should return readonly state object', () => {
      state.startDrag('A', nodeA);
      state.updateDrag({ x: 290, y: 70 }, nodeBoundsMap);

      const readonlyState = state.state;

      expect(readonlyState.isActive).toBe(true);
      expect(readonlyState.sourceNodeId).toBe('A');
      expect(readonlyState.hoverTargetId).toBe('B');
    });
  });

  describe('edge cases', () => {
    it('should handle starting drag from different nodes', () => {
      state.startDrag('B', nodeB);

      expect(state.sourceNodeId).toBe('B');
      expect(state.sourcePoint).toEqual({
        x: 250 + 80 / 2, // 290
        y: 50 + 40, // 90
      });
    });

    it('should handle restarting drag', () => {
      state.startDrag('A', nodeA);
      state.updateDrag({ x: 200, y: 100 }, nodeBoundsMap);

      state.startDrag('B', nodeB);

      expect(state.sourceNodeId).toBe('B');
      expect(state.hoverTargetId).toBeNull();
    });

    it('should handle nodes with different sizes', () => {
      const largeNode: NodeBounds = {
        x: 0,
        y: 0,
        width: 200,
        height: 100,
      };

      state.startDrag('Large', largeNode);

      expect(state.sourcePoint).toEqual({
        x: 100, // 0 + 200/2
        y: 100, // 0 + 100
      });
    });
  });
});

