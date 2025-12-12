/**
 * Core type definitions for Merfolk Editor
 * Compatible with Mermaid flowchart syntax
 */

/**
 * Node shape types - maps to Mermaid flowchart node syntax
 */
export type ShapeType =
  | 'rect'           // [text] - rectangle
  | 'rounded'        // (text) - rounded rectangle
  | 'stadium'        // ([text]) - stadium/pill shape
  | 'subroutine'     // [[text]] - subroutine
  | 'cylinder'       // [(text)] - cylinder/database
  | 'circle'         // ((text)) - circle
  | 'doublecircle'   // (((text))) - double circle
  | 'diamond'        // {text} - diamond/rhombus
  | 'hexagon'        // {{text}} - hexagon
  | 'trapezoid'      // [/text/] - trapezoid
  | 'inv_trapezoid'  // [\text\] - inverted trapezoid
  | 'lean_right'     // [/text\] - parallelogram leaning right
  | 'lean_left'      // [\text/] - parallelogram leaning left
  | 'odd';           // >text] - asymmetric/flag shape

/**
 * Edge stroke types
 */
export type StrokeType = 'normal' | 'thick' | 'dotted' | 'invisible';

/**
 * Arrow types for edge endpoints
 */
export type ArrowType = 'arrow' | 'circle' | 'cross' | 'none';

/**
 * Graph direction
 */
export type Direction = 'TB' | 'BT' | 'LR' | 'RL';

/**
 * 2D position
 */
export interface Position {
  x: number;
  y: number;
}

/**
 * Size dimensions
 */
export interface Size {
  width: number;
  height: number;
}

/**
 * Bounding box (position + size)
 */
export interface BoundingBox extends Position, Size {}

/**
 * Node style properties
 */
export interface NodeStyle {
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  color?: string;
}

/**
 * Edge style properties
 */
export interface EdgeStyle {
  stroke?: string;
  strokeWidth?: number;
}

/**
 * Event types emitted by the model
 */
export type ModelEventType =
  | 'node:add'
  | 'node:remove'
  | 'node:update'
  | 'edge:add'
  | 'edge:remove'
  | 'edge:update'
  | 'subgraph:add'
  | 'subgraph:remove'
  | 'subgraph:update'
  | 'direction:change'
  | 'batch';

/**
 * Model change event payload
 */
export interface ModelChangeEvent<T = unknown> {
  type: ModelEventType;
  target?: T;
  previousValue?: T;
  newValue?: T;
}

/**
 * Event listener function type
 */
export type EventListener<T> = (event: T) => void;
