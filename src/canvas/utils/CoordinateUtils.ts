/**
 * Utility functions for coordinate transformations
 */

export interface Point {
  x: number;
  y: number;
}

export interface NodeInfo {
  x: number; // transform x (center)
  y: number; // transform y (center)
  bboxX: number; // local bounding box x offset
  bboxY: number; // local bounding box y offset
  width: number;
  height: number;
}

export interface Bounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Calculate global SVG bounds from node transform and local bounding box
 *
 * @param nodeInfo - Node position and size information
 * @returns Global bounds in SVG coordinate system
 */
export function calculateNodeSvgBounds(nodeInfo: NodeInfo): Bounds {
  return {
    x: nodeInfo.x + nodeInfo.bboxX,
    y: nodeInfo.y + nodeInfo.bboxY,
    width: nodeInfo.width,
    height: nodeInfo.height,
  };
}

/**
 * Calculate the bottom center point of a bounds rectangle
 *
 * @param bounds - Rectangle bounds
 * @returns Bottom center point
 */
export function getBottomCenterPoint(bounds: Bounds): Point {
  return {
    x: bounds.x + bounds.width / 2,
    y: bounds.y + bounds.height,
  };
}

/**
 * Check if a point is within bounds (with optional tolerance)
 *
 * @param point - Point to check
 * @param bounds - Bounds to check against
 * @param tolerance - Additional pixels around bounds for hit detection
 * @returns True if point is within bounds
 */
export function isPointInBounds(
  point: Point,
  bounds: Bounds,
  tolerance: number = 0
): boolean {
  return (
    point.x >= bounds.x - tolerance &&
    point.x <= bounds.x + bounds.width + tolerance &&
    point.y >= bounds.y - tolerance &&
    point.y <= bounds.y + bounds.height + tolerance
  );
}

/**
 * Transform screen coordinates to SVG coordinates
 * (Manual calculation for testing without DOM)
 *
 * @param screenX - Screen X coordinate relative to container
 * @param screenY - Screen Y coordinate relative to container
 * @param translateX - Container translate X
 * @param translateY - Container translate Y
 * @param scale - Container scale
 * @returns SVG coordinates
 */
export function screenToSvgCoordsManual(
  screenX: number,
  screenY: number,
  translateX: number,
  translateY: number,
  scale: number
): Point {
  return {
    x: (screenX - translateX) / scale,
    y: (screenY - translateY) / scale,
  };
}

/**
 * Transform SVG coordinates to screen coordinates
 *
 * @param svgX - SVG X coordinate
 * @param svgY - SVG Y coordinate
 * @param translateX - Container translate X
 * @param translateY - Container translate Y
 * @param scale - Container scale
 * @returns Screen coordinates relative to container
 */
export function svgToScreenCoords(
  svgX: number,
  svgY: number,
  translateX: number,
  translateY: number,
  scale: number
): Point {
  return {
    x: svgX * scale + translateX,
    y: svgY * scale + translateY,
  };
}

