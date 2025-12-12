import type { StrokeType, ArrowType, EdgeStyle, Position } from './types';

/**
 * Data interface for creating/updating edges
 */
export interface EdgeData {
  id: string;
  source: string;
  target: string;
  text?: string;
  stroke: StrokeType;
  arrowStart: ArrowType;
  arrowEnd: ArrowType;
  style?: EdgeStyle;
  cssClasses?: string[];
  animate?: boolean;
  animation?: 'fast' | 'slow';
}

/**
 * Flowchart edge model
 */
export class FlowEdge implements EdgeData {
  readonly id: string;
  source: string;
  target: string;
  text?: string;
  stroke: StrokeType;
  arrowStart: ArrowType;
  arrowEnd: ArrowType;
  style?: EdgeStyle;
  cssClasses: string[];
  animate?: boolean;
  animation?: 'fast' | 'slow';

  /** Runtime computed path points from layout */
  points?: Position[];

  constructor(data: EdgeData) {
    this.id = data.id;
    this.source = data.source;
    this.target = data.target;
    this.text = data.text;
    this.stroke = data.stroke;
    this.arrowStart = data.arrowStart;
    this.arrowEnd = data.arrowEnd;
    this.style = data.style ? { ...data.style } : undefined;
    this.cssClasses = data.cssClasses ? [...data.cssClasses] : [];
    this.animate = data.animate;
    this.animation = data.animation;
  }

  /**
   * Create a deep copy of this edge
   */
  clone(): FlowEdge {
    const edge = new FlowEdge({
      id: this.id,
      source: this.source,
      target: this.target,
      text: this.text,
      stroke: this.stroke,
      arrowStart: this.arrowStart,
      arrowEnd: this.arrowEnd,
      style: this.style ? { ...this.style } : undefined,
      cssClasses: [...this.cssClasses],
      animate: this.animate,
      animation: this.animation,
    });
    edge.points = this.points ? this.points.map((p) => ({ ...p })) : undefined;
    return edge;
  }

  /**
   * Convert to plain data object
   */
  toData(): EdgeData {
    return {
      id: this.id,
      source: this.source,
      target: this.target,
      text: this.text,
      stroke: this.stroke,
      arrowStart: this.arrowStart,
      arrowEnd: this.arrowEnd,
      style: this.style ? { ...this.style } : undefined,
      cssClasses: [...this.cssClasses],
      animate: this.animate,
      animation: this.animation,
    };
  }
}
