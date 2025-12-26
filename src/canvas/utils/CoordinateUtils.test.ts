import { describe, it, expect } from 'vitest';
import {
  calculateNodeSvgBounds,
  getBottomCenterPoint,
  isPointInBounds,
  screenToSvgCoordsManual,
  svgToScreenCoords,
  type NodeInfo,
  type Bounds,
} from './CoordinateUtils';

describe('CoordinateUtils', () => {
  describe('calculateNodeSvgBounds', () => {
    it('should calculate global bounds from transform and bbox', () => {
      const nodeInfo: NodeInfo = {
        x: 100, // transform center
        y: 50,
        bboxX: -40, // local bbox offset (half width left of center)
        bboxY: -20, // local bbox offset (half height above center)
        width: 80,
        height: 40,
      };

      const bounds = calculateNodeSvgBounds(nodeInfo);

      expect(bounds).toEqual({
        x: 60, // 100 + (-40)
        y: 30, // 50 + (-20)
        width: 80,
        height: 40,
      });
    });

    it('should handle zero offset bbox', () => {
      const nodeInfo: NodeInfo = {
        x: 100,
        y: 50,
        bboxX: 0,
        bboxY: 0,
        width: 80,
        height: 40,
      };

      const bounds = calculateNodeSvgBounds(nodeInfo);

      expect(bounds).toEqual({
        x: 100,
        y: 50,
        width: 80,
        height: 40,
      });
    });

    it('should handle positive offset bbox', () => {
      const nodeInfo: NodeInfo = {
        x: 0,
        y: 0,
        bboxX: 10,
        bboxY: 20,
        width: 100,
        height: 50,
      };

      const bounds = calculateNodeSvgBounds(nodeInfo);

      expect(bounds).toEqual({
        x: 10,
        y: 20,
        width: 100,
        height: 50,
      });
    });
  });

  describe('getBottomCenterPoint', () => {
    it('should return bottom center of bounds', () => {
      const bounds: Bounds = {
        x: 100,
        y: 50,
        width: 80,
        height: 40,
      };

      const point = getBottomCenterPoint(bounds);

      expect(point).toEqual({
        x: 140, // 100 + 80/2
        y: 90, // 50 + 40
      });
    });

    it('should handle bounds at origin', () => {
      const bounds: Bounds = {
        x: 0,
        y: 0,
        width: 100,
        height: 50,
      };

      const point = getBottomCenterPoint(bounds);

      expect(point).toEqual({
        x: 50,
        y: 50,
      });
    });
  });

  describe('isPointInBounds', () => {
    const bounds: Bounds = {
      x: 100,
      y: 50,
      width: 80,
      height: 40,
    };

    it('should return true for point inside bounds', () => {
      expect(isPointInBounds({ x: 140, y: 70 }, bounds)).toBe(true);
    });

    it('should return true for point on edge', () => {
      expect(isPointInBounds({ x: 100, y: 50 }, bounds)).toBe(true); // top-left
      expect(isPointInBounds({ x: 180, y: 90 }, bounds)).toBe(true); // bottom-right
    });

    it('should return false for point outside bounds', () => {
      expect(isPointInBounds({ x: 99, y: 70 }, bounds)).toBe(false); // left
      expect(isPointInBounds({ x: 181, y: 70 }, bounds)).toBe(false); // right
      expect(isPointInBounds({ x: 140, y: 49 }, bounds)).toBe(false); // top
      expect(isPointInBounds({ x: 140, y: 91 }, bounds)).toBe(false); // bottom
    });

    it('should respect tolerance parameter', () => {
      expect(isPointInBounds({ x: 95, y: 70 }, bounds, 10)).toBe(true);
      expect(isPointInBounds({ x: 185, y: 70 }, bounds, 10)).toBe(true);
      expect(isPointInBounds({ x: 140, y: 45 }, bounds, 10)).toBe(true);
      expect(isPointInBounds({ x: 140, y: 95 }, bounds, 10)).toBe(true);
    });

    it('should return false when outside tolerance', () => {
      expect(isPointInBounds({ x: 85, y: 70 }, bounds, 10)).toBe(false);
    });
  });

  describe('screenToSvgCoordsManual', () => {
    it('should convert screen to SVG coords at scale 1', () => {
      const result = screenToSvgCoordsManual(150, 100, 50, 30, 1);

      expect(result).toEqual({
        x: 100, // (150 - 50) / 1
        y: 70, // (100 - 30) / 1
      });
    });

    it('should handle scale > 1 (zoomed in)', () => {
      const result = screenToSvgCoordsManual(200, 160, 100, 60, 2);

      expect(result).toEqual({
        x: 50, // (200 - 100) / 2
        y: 50, // (160 - 60) / 2
      });
    });

    it('should handle scale < 1 (zoomed out)', () => {
      const result = screenToSvgCoordsManual(100, 80, 50, 30, 0.5);

      expect(result).toEqual({
        x: 100, // (100 - 50) / 0.5
        y: 100, // (80 - 30) / 0.5
      });
    });

    it('should handle negative translate', () => {
      const result = screenToSvgCoordsManual(100, 100, -50, -50, 1);

      expect(result).toEqual({
        x: 150, // (100 - (-50)) / 1
        y: 150, // (100 - (-50)) / 1
      });
    });

    it('should handle zero translate', () => {
      const result = screenToSvgCoordsManual(100, 100, 0, 0, 1);

      expect(result).toEqual({ x: 100, y: 100 });
    });
  });

  describe('svgToScreenCoords', () => {
    it('should convert SVG to screen coords at scale 1', () => {
      const result = svgToScreenCoords(100, 70, 50, 30, 1);

      expect(result).toEqual({
        x: 150, // 100 * 1 + 50
        y: 100, // 70 * 1 + 30
      });
    });

    it('should handle scale > 1 (zoomed in)', () => {
      const result = svgToScreenCoords(50, 50, 100, 60, 2);

      expect(result).toEqual({
        x: 200, // 50 * 2 + 100
        y: 160, // 50 * 2 + 60
      });
    });

    it('should handle scale < 1 (zoomed out)', () => {
      const result = svgToScreenCoords(100, 100, 50, 30, 0.5);

      expect(result).toEqual({
        x: 100, // 100 * 0.5 + 50
        y: 80, // 100 * 0.5 + 30
      });
    });

    it('should be inverse of screenToSvgCoordsManual', () => {
      const screenX = 200;
      const screenY = 150;
      const translateX = 50;
      const translateY = 30;
      const scale = 1.5;

      const svgCoords = screenToSvgCoordsManual(
        screenX,
        screenY,
        translateX,
        translateY,
        scale
      );
      const backToScreen = svgToScreenCoords(
        svgCoords.x,
        svgCoords.y,
        translateX,
        translateY,
        scale
      );

      expect(backToScreen.x).toBeCloseTo(screenX);
      expect(backToScreen.y).toBeCloseTo(screenY);
    });
  });
});

