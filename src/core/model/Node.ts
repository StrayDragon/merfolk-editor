import type { ShapeType, Position, Size, BoundingBox, NodeStyle } from './types';

/**
 * Data interface for creating/updating nodes
 */
export interface NodeData {
  id: string;
  text: string;
  shape: ShapeType;
  position?: Position;
  size?: Size;
  style?: NodeStyle;
  cssClasses?: string[];
  link?: string;
  linkTarget?: '_self' | '_blank' | '_parent' | '_top';
  tooltip?: string;
  parentId?: string;
  /** X position override for drag */
  x?: number;
  /** Y position override for drag */
  y?: number;
  /** Icon for icon shape (FontAwesome, etc.) */
  icon?: string;
  /** Image URL for image shape */
  img?: string;
  /** Icon/image form: square, rounded, circle */
  form?: string;
  /** Label position: t (top), b (bottom) */
  pos?: 't' | 'b';
  /** Custom width */
  width?: number;
  /** Custom height */
  height?: number;
}

/**
 * Flowchart node model
 */
export class FlowNode implements NodeData {
  readonly id: string;
  text: string;
  shape: ShapeType;
  position?: Position;
  size?: Size;
  style?: NodeStyle;
  cssClasses: string[];
  link?: string;
  linkTarget?: '_self' | '_blank' | '_parent' | '_top';
  tooltip?: string;
  parentId?: string;
  x?: number;
  y?: number;
  icon?: string;
  img?: string;
  form?: string;
  pos?: 't' | 'b';
  width?: number;
  height?: number;

  /** Runtime computed bounds from layout */
  private _computedBounds?: BoundingBox;

  constructor(data: NodeData) {
    this.id = data.id;
    this.text = data.text;
    this.shape = data.shape;
    this.position = data.position ? { ...data.position } : undefined;
    this.size = data.size ? { ...data.size } : undefined;
    this.style = data.style ? { ...data.style } : undefined;
    this.cssClasses = data.cssClasses ? [...data.cssClasses] : [];
    this.link = data.link;
    this.linkTarget = data.linkTarget;
    this.tooltip = data.tooltip;
    this.parentId = data.parentId;
    this.x = data.x;
    this.y = data.y;
    this.icon = data.icon;
    this.img = data.img;
    this.form = data.form;
    this.pos = data.pos;
    this.width = data.width;
    this.height = data.height;
  }

  /**
   * Get the bounding box (manual position/size or computed from layout)
   */
  get bounds(): BoundingBox | undefined {
    if (this.position && this.size) {
      return {
        x: this.position.x,
        y: this.position.y,
        width: this.size.width,
        height: this.size.height,
      };
    }
    return this._computedBounds;
  }

  /**
   * Set computed bounds from layout engine
   */
  set bounds(value: BoundingBox | undefined) {
    this._computedBounds = value;
  }

  /**
   * Create a deep copy of this node
   */
  clone(): FlowNode {
    const node = new FlowNode({
      id: this.id,
      text: this.text,
      shape: this.shape,
      position: this.position ? { ...this.position } : undefined,
      size: this.size ? { ...this.size } : undefined,
      style: this.style ? { ...this.style } : undefined,
      cssClasses: [...this.cssClasses],
      link: this.link,
      linkTarget: this.linkTarget,
      tooltip: this.tooltip,
      parentId: this.parentId,
      x: this.x,
      y: this.y,
      icon: this.icon,
      img: this.img,
      form: this.form,
      pos: this.pos,
      width: this.width,
      height: this.height,
    });
    node._computedBounds = this._computedBounds
      ? { ...this._computedBounds }
      : undefined;
    return node;
  }

  /**
   * Convert to plain data object
   */
  toData(): NodeData {
    return {
      id: this.id,
      text: this.text,
      shape: this.shape,
      position: this.position ? { ...this.position } : undefined,
      size: this.size ? { ...this.size } : undefined,
      style: this.style ? { ...this.style } : undefined,
      cssClasses: [...this.cssClasses],
      link: this.link,
      linkTarget: this.linkTarget,
      tooltip: this.tooltip,
      parentId: this.parentId,
      x: this.x,
      y: this.y,
      icon: this.icon,
      img: this.img,
      form: this.form,
      pos: this.pos,
      width: this.width,
      height: this.height,
    };
  }
}
