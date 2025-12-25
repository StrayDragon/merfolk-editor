import { describe, it, expect, beforeEach } from 'vitest';
import { EdgeCreationState } from './EdgeCreationState';
import type { Port } from './PortManager';

describe('EdgeCreationState', () => {
  let state: EdgeCreationState;

  const sourcePort: Port = {
    id: 'A-right',
    nodeId: 'A',
    position: 'right',
    x: 140,
    y: 100,
  };

  const targetPort: Port = {
    id: 'B-left',
    nodeId: 'B',
    position: 'left',
    x: 260,
    y: 100,
  };

  const sameNodePort: Port = {
    id: 'A-left',
    nodeId: 'A',
    position: 'left',
    x: 60,
    y: 100,
  };

  beforeEach(() => {
    state = new EdgeCreationState();
  });

  describe('startFromPort', () => {
    it('should activate state and set source port', () => {
      state.startFromPort(sourcePort);

      expect(state.isActive).toBe(true);
      expect(state.sourcePort).toEqual(sourcePort);
    });

    it('should initialize preview line', () => {
      state.startFromPort(sourcePort);

      expect(state.previewLine).toEqual({
        sourceX: 140,
        sourceY: 100,
        targetX: 140,
        targetY: 100,
      });
    });
  });

  describe('updatePreview', () => {
    it('should update preview line target', () => {
      state.startFromPort(sourcePort);
      state.updatePreview(200, 150);

      expect(state.previewLine?.targetX).toBe(200);
      expect(state.previewLine?.targetY).toBe(150);
    });

    it('should keep source position', () => {
      state.startFromPort(sourcePort);
      state.updatePreview(200, 150);

      expect(state.previewLine?.sourceX).toBe(140);
      expect(state.previewLine?.sourceY).toBe(100);
    });

    it('should do nothing when not active', () => {
      state.updatePreview(200, 150);

      expect(state.previewLine).toBeNull();
    });
  });

  describe('snapToPort', () => {
    it('should snap preview to port position', () => {
      state.startFromPort(sourcePort);
      state.updatePreview(250, 110);
      state.snapToPort(targetPort);

      expect(state.previewLine?.targetX).toBe(260);
      expect(state.previewLine?.targetY).toBe(100);
    });
  });

  describe('completeToPort', () => {
    it('should return edge data and reset state', () => {
      state.startFromPort(sourcePort);

      const result = state.completeToPort(targetPort);

      expect(result).toEqual({
        sourceNodeId: 'A',
        targetNodeId: 'B',
      });
      expect(state.isActive).toBe(false);
      expect(state.sourcePort).toBeNull();
    });

    it('should prevent self-connection', () => {
      state.startFromPort(sourcePort);

      const result = state.completeToPort(sameNodePort);

      expect(result).toBeNull();
      expect(state.isActive).toBe(false);
    });

    it('should return null when not active', () => {
      const result = state.completeToPort(targetPort);

      expect(result).toBeNull();
    });
  });

  describe('cancel', () => {
    it('should reset all state', () => {
      state.startFromPort(sourcePort);
      state.updatePreview(200, 150);

      state.cancel();

      expect(state.isActive).toBe(false);
      expect(state.sourcePort).toBeNull();
      expect(state.previewLine).toBeNull();
    });
  });
});

