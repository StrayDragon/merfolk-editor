/**
 * Core type definitions for Merfolk Editor
 * Compatible with Mermaid flowchart syntax
 */

/**
 * Legacy node shape types - maps to traditional Mermaid flowchart syntax
 */
export type LegacyShapeType =
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
 * Extended shape types from Mermaid v11.3.0+ @{} syntax
 */
export type ExtendedShapeType =
  // Document shapes
  | 'doc'            // Document shape
  | 'notch-rect'     // Card/Notched rectangle
  | 'bow-rect'       // Bow tie rectangle
  | 'braces'         // Curly braces
  | 'brace-l'        // Left brace
  | 'brace-r'        // Right brace
  // Geometric shapes
  | 'triangle'       // Triangle
  | 'flip-triangle'  // Flipped triangle
  | 'cross'          // Crossed circle
  | 'hourglass'      // Hourglass
  | 'bolt'           // Lightning bolt
  | 'com-link'       // Communication link
  // Container shapes
  | 'window-pane'    // Window pane
  | 'divided-rect'   // Divided rectangle
  | 'lin-rect'       // Lined rectangle
  | 'fork'           // Fork/join shape
  // Process shapes
  | 'delay'          // Delay shape
  | 'h-cyl'          // Horizontal cylinder
  | 'curved-trap'    // Curved trapezoid
  | 'sl-rect'        // Sloped rectangle
  | 'fr-rect'        // Framed rectangle
  | 'sm-circ'        // Small circle
  | 'fr-circ'        // Framed circle
  | 'dbl-circ'       // Double circle (alias)
  | 'lin-cyl'        // Lined cylinder
  | 'tilted-cyl'     // Tilted cylinder
  // Wave shapes
  | 'flag'           // Flag shape
  | 'wave-rect'      // Wave edged rectangle
  | 'tag-rect'       // Tagged rectangle
  | 'wave-edged'     // Wave edged
  | 'tag-doc'        // Tagged document
  | 'half-rounded'   // Half-rounded rectangle
  | 'multi-rect'     // Multi-stacked rectangle
  | 'multi-wave'     // Multi-wave edged
  // Special shapes
  | 'text'           // Text only (no border)
  | 'icon'           // Icon shape
  | 'image';         // Image shape

/**
 * Node shape types - all supported shapes
 */
export type ShapeType = LegacyShapeType | ExtendedShapeType;

/**
 * Shape alias mapping (short names to canonical names)
 */
export const SHAPE_ALIASES: Record<string, ShapeType> = {
  // Rectangle variants
  'rect': 'rect',
  'square': 'rect',
  'process': 'rect',
  'proc': 'rect',
  // Rounded
  'round': 'rounded',
  'rounded': 'rounded',
  // Stadium
  'stadium': 'stadium',
  'pill': 'stadium',
  'terminal': 'stadium',
  // Subroutine
  'subroutine': 'subroutine',
  'subproc': 'subroutine',
  'fr-rect': 'subroutine',
  // Cylinder
  'cyl': 'cylinder',
  'cylinder': 'cylinder',
  'db': 'cylinder',
  'database': 'cylinder',
  // Circle
  'circ': 'circle',
  'circle': 'circle',
  // Double circle
  'dbl-circ': 'doublecircle',
  'doublecircle': 'doublecircle',
  // Diamond
  'diam': 'diamond',
  'diamond': 'diamond',
  'decision': 'diamond',
  // Hexagon
  'hex': 'hexagon',
  'hexagon': 'hexagon',
  'prepare': 'hexagon',
  // Trapezoid
  'trap-b': 'trapezoid',
  'trapezoid': 'trapezoid',
  'trap-t': 'inv_trapezoid',
  'inv-trapezoid': 'inv_trapezoid',
  // Parallelograms
  'lean-r': 'lean_right',
  'lean_right': 'lean_right',
  'lean-l': 'lean_left',
  'lean_left': 'lean_left',
  'in-out': 'lean_right',
  'out-in': 'lean_left',
  // Odd/flag
  'odd': 'odd',
  'flag': 'odd',
  // Document
  'doc': 'doc',
  'document': 'doc',
  // Card
  'notch-rect': 'notch-rect',
  'card': 'notch-rect',
  // Triangle
  'tri': 'triangle',
  'triangle': 'triangle',
  // Bolt
  'bolt': 'bolt',
  'lightning-bolt': 'bolt',
  // Other new shapes
  'delay': 'delay',
  'hourglass': 'hourglass',
  'bow-rect': 'bow-rect',
  'brace': 'braces',
  'braces': 'braces',
  'comment': 'braces',
  'fork': 'fork',
  'join': 'fork',
  'cross': 'cross',
  'crossed-circle': 'cross',
  'lin-rect': 'lin-rect',
  'lined-process': 'lin-rect',
  'div-rect': 'divided-rect',
  'divided-rect': 'divided-rect',
  'divided-process': 'divided-rect',
  'text': 'text',
  'icon': 'icon',
  'image': 'image',
  'img': 'image',
};

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
