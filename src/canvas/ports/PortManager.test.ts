import { describe, it, expect, beforeEach } from 'vitest';
import { PortManager } from './PortManager';
import type { NodeBounds } from './PortManager';

describe('PortManager', () => {
  let pm: PortManager;

  beforeEach(() => {
    pm = new PortManager();
  });

  describe('updatePortsForNode', () => {
    it('should create 4 ports for a node', () => {
      const node: NodeBounds = {
        id: 'A',
        x: 100,
        y: 100,
        width: 80,
        height: 40,
      };

      pm.updatePortsForNode(node);

      const ports = pm.getPortsForNode('A');
      expect(ports).toHaveLength(4);
      expect(ports.map((p) => p.position).sort()).toEqual([
        'bottom',
        'left',
        'right',
        'top',
      ]);
    });

    it('should calculate correct port positions', () => {
      const node: NodeBounds = {
        id: 'A',
        x: 100, // center x
        y: 100, // center y
        width: 80,
        height: 40,
      };

      pm.updatePortsForNode(node);

      const ports = pm.getPortsForNode('A');
      const top = ports.find((p) => p.position === 'top')!;
      const right = ports.find((p) => p.position === 'right')!;
      const bottom = ports.find((p) => p.position === 'bottom')!;
      const left = ports.find((p) => p.position === 'left')!;

      expect(top).toEqual({
        id: 'A-top',
        nodeId: 'A',
        position: 'top',
        x: 100,
        y: 80, // 100 - 40/2
      });

      expect(right).toEqual({
        id: 'A-right',
        nodeId: 'A',
        position: 'right',
        x: 140, // 100 + 80/2
        y: 100,
      });

      expect(bottom).toEqual({
        id: 'A-bottom',
        nodeId: 'A',
        position: 'bottom',
        x: 100,
        y: 120, // 100 + 40/2
      });

      expect(left).toEqual({
        id: 'A-left',
        nodeId: 'A',
        position: 'left',
        x: 60, // 100 - 80/2
        y: 100,
      });
    });
  });

  describe('findNearestPort', () => {
    beforeEach(() => {
      pm.updatePortsForNode({ id: 'A', x: 100, y: 100, width: 80, height: 40 });
      pm.updatePortsForNode({ id: 'B', x: 300, y: 100, width: 80, height: 40 });
    });

    it('should find the nearest port', () => {
      const port = pm.findNearestPort(145, 100); // Close to A-right

      expect(port).toBeDefined();
      expect(port?.id).toBe('A-right');
    });

    it('should exclude specified node', () => {
      // Use larger maxDistance to reach node B (x=300, left port at 260)
      const port = pm.findNearestPort(145, 100, 'A', 200);

      expect(port).toBeDefined();
      expect(port?.nodeId).toBe('B');
    });

    it('should return null if no port within distance', () => {
      const port = pm.findNearestPort(1000, 1000, undefined, 50);

      expect(port).toBeNull();
    });
  });

  describe('findBestPort', () => {
    beforeEach(() => {
      pm.updatePortsForNode({ id: 'A', x: 100, y: 100, width: 80, height: 40 });
    });

    it('should find the closest port on a node', () => {
      // Coming from the right side
      const port = pm.findBestPort('A', 200, 100);

      expect(port?.position).toBe('right');
    });

    it('should find top port when approaching from above', () => {
      const port = pm.findBestPort('A', 100, 0);

      expect(port?.position).toBe('top');
    });
  });

  describe('getPort', () => {
    beforeEach(() => {
      pm.updatePortsForNode({ id: 'A', x: 100, y: 100, width: 80, height: 40 });
    });

    it('should get port by ID', () => {
      const port = pm.getPort('A-right');

      expect(port).toBeDefined();
      expect(port?.position).toBe('right');
    });

    it('should return undefined for unknown port', () => {
      const port = pm.getPort('unknown');

      expect(port).toBeUndefined();
    });
  });

  describe('clear', () => {
    it('should clear all ports', () => {
      pm.updatePortsForNode({ id: 'A', x: 100, y: 100, width: 80, height: 40 });
      pm.clear();

      expect(pm.getAllPorts()).toHaveLength(0);
    });

    it('should clear specific node', () => {
      pm.updatePortsForNode({ id: 'A', x: 100, y: 100, width: 80, height: 40 });
      pm.updatePortsForNode({ id: 'B', x: 300, y: 100, width: 80, height: 40 });

      pm.clearNode('A');

      expect(pm.getPortsForNode('A')).toHaveLength(0);
      expect(pm.getPortsForNode('B')).toHaveLength(4);
    });
  });
});

