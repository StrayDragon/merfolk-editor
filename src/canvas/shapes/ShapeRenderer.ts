import * as d3 from 'd3';
import type { FlowNode } from '../../core/model/Node';
import type { BoundingBox } from '../../core/model/types';

/**
 * Default node dimensions - matching Mermaid defaults
 */
const DEFAULT_WIDTH = 150;
const DEFAULT_HEIGHT = 54;
const DEFAULT_PADDING = 10;

/**
 * Mermaid default colors
 */
const MERMAID_FILL = '#ECECFF';
const MERMAID_STROKE = '#9370DB';
const MERMAID_TEXT_COLOR = '#333';
const MERMAID_FONT_FAMILY = '"trebuchet ms", verdana, arial, sans-serif';
const MERMAID_FONT_SIZE = '16px';

/**
 * Shape renderer - renders different node shapes
 */
export class ShapeRenderer {
  /**
   * Render a node shape
   */
  render(
    group: d3.Selection<SVGGElement, unknown, null, undefined>,
    node: FlowNode,
    bounds: BoundingBox
  ): void {
    const width = bounds.width || DEFAULT_WIDTH;
    const height = bounds.height || DEFAULT_HEIGHT;

    // Get style - use Mermaid defaults
    const fill = node.style?.fill || MERMAID_FILL;
    const stroke = node.style?.stroke || MERMAID_STROKE;
    const strokeWidth = node.style?.strokeWidth || 1;

    // Render shape based on type
    switch (node.shape) {
      case 'rounded':
        this.renderRounded(group, width, height, fill, stroke, strokeWidth);
        break;
      case 'circle':
        this.renderCircle(group, width, height, fill, stroke, strokeWidth);
        break;
      case 'diamond':
        this.renderDiamond(group, width, height, fill, stroke, strokeWidth);
        break;
      case 'stadium':
        this.renderStadium(group, width, height, fill, stroke, strokeWidth);
        break;
      case 'cylinder':
        this.renderCylinder(group, width, height, fill, stroke, strokeWidth);
        break;
      case 'hexagon':
        this.renderHexagon(group, width, height, fill, stroke, strokeWidth);
        break;
      case 'doublecircle':
        this.renderDoubleCircle(group, width, height, fill, stroke, strokeWidth);
        break;
      case 'subroutine':
        this.renderSubroutine(group, width, height, fill, stroke, strokeWidth);
        break;
      case 'odd':
        this.renderOdd(group, width, height, fill, stroke, strokeWidth);
        break;
      case 'rect':
      default:
        this.renderRect(group, width, height, fill, stroke, strokeWidth);
        break;
    }

    // Render text label
    this.renderLabel(group, node.text, width, height, node.style?.color);
  }

  /**
   * Rectangle shape - matching Mermaid's squareRect.ts
   */
  private renderRect(
    group: d3.Selection<SVGGElement, unknown, null, undefined>,
    width: number,
    height: number,
    fill: string,
    stroke: string,
    strokeWidth: number
  ): void {
    group
      .append('rect')
      .attr('x', -width / 2)
      .attr('y', -height / 2)
      .attr('width', width)
      .attr('height', height)
      .attr('fill', fill)
      .attr('stroke', stroke)
      .attr('stroke-width', strokeWidth)
      .attr('class', 'basic label-container');
  }

  /**
   * Rounded rectangle shape - matching Mermaid's roundedRect.ts
   */
  private renderRounded(
    group: d3.Selection<SVGGElement, unknown, null, undefined>,
    width: number,
    height: number,
    fill: string,
    stroke: string,
    strokeWidth: number
  ): void {
    // Mermaid uses rx=5, ry=5 for rounded rectangles
    const rx = 5;
    group
      .append('rect')
      .attr('x', -width / 2)
      .attr('y', -height / 2)
      .attr('width', width)
      .attr('height', height)
      .attr('rx', rx)
      .attr('ry', rx)
      .attr('fill', fill)
      .attr('stroke', stroke)
      .attr('stroke-width', strokeWidth)
      .attr('class', 'basic label-container');
  }

  /**
   * Circle shape - matching Mermaid's circle.ts
   */
  private renderCircle(
    group: d3.Selection<SVGGElement, unknown, null, undefined>,
    width: number,
    height: number,
    fill: string,
    stroke: string,
    strokeWidth: number
  ): void {
    // width and height should be equal (diameter)
    const r = width / 2;
    group
      .append('circle')
      .attr('cx', 0)
      .attr('cy', 0)
      .attr('r', r)
      .attr('fill', fill)
      .attr('stroke', stroke)
      .attr('stroke-width', strokeWidth)
      .attr('class', 'basic label-container');
  }

  /**
   * Double circle shape
   */
  private renderDoubleCircle(
    group: d3.Selection<SVGGElement, unknown, null, undefined>,
    width: number,
    height: number,
    fill: string,
    stroke: string,
    strokeWidth: number
  ): void {
    const r = Math.min(width, height) / 2;
    const innerR = r - 6;

    // Outer circle
    group
      .append('circle')
      .attr('cx', 0)
      .attr('cy', 0)
      .attr('r', r)
      .attr('fill', fill)
      .attr('stroke', stroke)
      .attr('stroke-width', strokeWidth)
      .attr('class', 'node-shape');

    // Inner circle
    group
      .append('circle')
      .attr('cx', 0)
      .attr('cy', 0)
      .attr('r', innerR)
      .attr('fill', 'none')
      .attr('stroke', stroke)
      .attr('stroke-width', strokeWidth);
  }

  /**
   * Diamond shape - matching Mermaid's question.ts
   * Mermaid uses: s = w + h, points at (s/2, 0), (s, -s/2), (s/2, -s), (0, -s/2)
   * Then translates by (-s/2, s/2) to center
   */
  private renderDiamond(
    group: d3.Selection<SVGGElement, unknown, null, undefined>,
    width: number,
    height: number,
    fill: string,
    stroke: string,
    strokeWidth: number
  ): void {
    // In Mermaid, s = width = height for diamond (it's a square rotated 45°)
    const s = width; // width and height should be equal for diamond

    // Mermaid's points (before translation)
    const points = [
      [s / 2, 0],
      [s, -s / 2],
      [s / 2, -s],
      [0, -s / 2],
    ];

    // Apply Mermaid's translation: (-s/2, s/2) to center the diamond
    const translatedPoints = points.map(([x, y]) => [
      x - s / 2,
      y + s / 2,
    ]);

    group
      .append('polygon')
      .attr('points', translatedPoints.map((p) => p.join(',')).join(' '))
      .attr('fill', fill)
      .attr('stroke', stroke)
      .attr('stroke-width', strokeWidth)
      .attr('class', 'label-container');
  }

  /**
   * Stadium/pill shape
   */
  private renderStadium(
    group: d3.Selection<SVGGElement, unknown, null, undefined>,
    width: number,
    height: number,
    fill: string,
    stroke: string,
    strokeWidth: number
  ): void {
    const rx = height / 2;
    group
      .append('rect')
      .attr('x', -width / 2)
      .attr('y', -height / 2)
      .attr('width', width)
      .attr('height', height)
      .attr('rx', rx)
      .attr('ry', rx)
      .attr('fill', fill)
      .attr('stroke', stroke)
      .attr('stroke-width', strokeWidth)
      .attr('class', 'node-shape');
  }

  /**
   * Cylinder/database shape
   */
  private renderCylinder(
    group: d3.Selection<SVGGElement, unknown, null, undefined>,
    width: number,
    height: number,
    fill: string,
    stroke: string,
    strokeWidth: number
  ): void {
    const ry = height / 6;
    const bodyHeight = height - ry * 2;

    // Main body
    group
      .append('path')
      .attr(
        'd',
        `M ${-width / 2} ${-bodyHeight / 2}
         L ${-width / 2} ${bodyHeight / 2}
         A ${width / 2} ${ry} 0 0 0 ${width / 2} ${bodyHeight / 2}
         L ${width / 2} ${-bodyHeight / 2}
         A ${width / 2} ${ry} 0 0 0 ${-width / 2} ${-bodyHeight / 2}`
      )
      .attr('fill', fill)
      .attr('stroke', stroke)
      .attr('stroke-width', strokeWidth)
      .attr('class', 'node-shape');

    // Top ellipse
    group
      .append('ellipse')
      .attr('cx', 0)
      .attr('cy', -bodyHeight / 2)
      .attr('rx', width / 2)
      .attr('ry', ry)
      .attr('fill', fill)
      .attr('stroke', stroke)
      .attr('stroke-width', strokeWidth);
  }

  /**
   * Hexagon shape
   */
  private renderHexagon(
    group: d3.Selection<SVGGElement, unknown, null, undefined>,
    width: number,
    height: number,
    fill: string,
    stroke: string,
    strokeWidth: number
  ): void {
    const offset = width / 6;
    const points = [
      [-width / 2 + offset, -height / 2],
      [width / 2 - offset, -height / 2],
      [width / 2, 0],
      [width / 2 - offset, height / 2],
      [-width / 2 + offset, height / 2],
      [-width / 2, 0],
    ];

    group
      .append('polygon')
      .attr('points', points.map((p) => p.join(',')).join(' '))
      .attr('fill', fill)
      .attr('stroke', stroke)
      .attr('stroke-width', strokeWidth)
      .attr('class', 'node-shape');
  }

  /**
   * Subroutine shape (rectangle with double vertical lines)
   */
  private renderSubroutine(
    group: d3.Selection<SVGGElement, unknown, null, undefined>,
    width: number,
    height: number,
    fill: string,
    stroke: string,
    strokeWidth: number
  ): void {
    const inset = 10;

    // Main rectangle
    group
      .append('rect')
      .attr('x', -width / 2)
      .attr('y', -height / 2)
      .attr('width', width)
      .attr('height', height)
      .attr('fill', fill)
      .attr('stroke', stroke)
      .attr('stroke-width', strokeWidth)
      .attr('class', 'node-shape');

    // Left line
    group
      .append('line')
      .attr('x1', -width / 2 + inset)
      .attr('y1', -height / 2)
      .attr('x2', -width / 2 + inset)
      .attr('y2', height / 2)
      .attr('stroke', stroke)
      .attr('stroke-width', strokeWidth);

    // Right line
    group
      .append('line')
      .attr('x1', width / 2 - inset)
      .attr('y1', -height / 2)
      .attr('x2', width / 2 - inset)
      .attr('y2', height / 2)
      .attr('stroke', stroke)
      .attr('stroke-width', strokeWidth);
  }

  /**
   * Odd/flag shape
   */
  private renderOdd(
    group: d3.Selection<SVGGElement, unknown, null, undefined>,
    width: number,
    height: number,
    fill: string,
    stroke: string,
    strokeWidth: number
  ): void {
    const offset = width / 6;
    const points = [
      [-width / 2 + offset, -height / 2],
      [width / 2, -height / 2],
      [width / 2, height / 2],
      [-width / 2 + offset, height / 2],
      [-width / 2, 0],
    ];

    group
      .append('polygon')
      .attr('points', points.map((p) => p.join(',')).join(' '))
      .attr('fill', fill)
      .attr('stroke', stroke)
      .attr('stroke-width', strokeWidth)
      .attr('class', 'node-shape');
  }

  /**
   * Render text label using foreignObject for HTML support (like Mermaid)
   */
  private renderLabel(
    group: d3.Selection<SVGGElement, unknown, null, undefined>,
    text: string,
    width: number,
    height: number,
    color?: string
  ): void {
    // Use foreignObject for HTML labels (matching Mermaid's approach)
    const fo = group
      .append('foreignObject')
      .attr('x', -width / 2)
      .attr('y', -height / 2)
      .attr('width', width)
      .attr('height', height)
      .attr('class', 'node-label-container');

    fo.append('xhtml:div')
      .style('display', 'flex')
      .style('align-items', 'center')
      .style('justify-content', 'center')
      .style('width', '100%')
      .style('height', '100%')
      .style('text-align', 'center')
      .style('color', color || MERMAID_TEXT_COLOR)
      .style('font-size', MERMAID_FONT_SIZE)
      .style('font-family', MERMAID_FONT_FAMILY)
      .style('line-height', '1.5')
      .style('white-space', 'nowrap')
      .attr('class', 'node-label')
      .append('xhtml:span')
      .attr('class', 'nodeLabel')
      .html(`<p>${text}</p>`);
  }

  /**
   * Calculate default bounds for a node based on text
   * Matching Mermaid's sizing logic from source code analysis
   *
   * Key formulas from Mermaid source:
   * - Rectangle: width = bbox.width + padding*4, height = bbox.height + padding*2
   * - Circle: radius = bbox.width/2 + halfPadding
   * - Diamond: s = bbox.width + bbox.height + 2*padding (square rotated 45°)
   * - Stadium: width = bbox.width + bbox.height/4 + padding
   * - Hexagon: width = bbox.width + padding*2.5
   */
  static calculateBounds(node: FlowNode): BoundingBox {
    // Estimate text dimensions (Mermaid uses actual DOM measurement via getBBox)
    // Using approximate values for 16px trebuchet ms font
    const charWidth = 9.3; // Approximate character width
    const bboxWidth = node.text.length * charWidth;
    const bboxHeight = 24; // Line height for 16px font

    // Mermaid default padding is 8 (from flowDb.ts line 1017)
    const padding = 8;
    const halfPadding = padding / 2;

    let adjustedWidth: number;
    let adjustedHeight: number;

    switch (node.shape) {
      case 'circle':
        // From circle.ts: radius = bbox.width/2 + halfPadding
        // Diameter = bbox.width + padding
        const circleRadius = bboxWidth / 2 + halfPadding;
        adjustedWidth = circleRadius * 2;
        adjustedHeight = adjustedWidth;
        break;

      case 'doublecircle':
        // Similar to circle but slightly larger
        const dblRadius = bboxWidth / 2 + halfPadding + 6;
        adjustedWidth = dblRadius * 2;
        adjustedHeight = adjustedWidth;
        break;

      case 'diamond':
        // From question.ts: s = (bbox.width + padding) + (bbox.height + padding)
        // The diamond is a square rotated 45°, diagonal = s
        const w = bboxWidth + padding;
        const h = bboxHeight + padding;
        const s = w + h;
        adjustedWidth = s;
        adjustedHeight = s;
        break;

      case 'hexagon':
        // From hexagon.ts: width = bbox.width + padding*2.5, height = bbox.height + padding
        adjustedWidth = bboxWidth + padding * 2.5;
        adjustedHeight = bboxHeight + padding;
        break;

      case 'stadium':
        // From stadium.ts: h = bbox.height + padding, w = bbox.width + h/4 + padding
        const stadiumH = bboxHeight + padding;
        adjustedWidth = bboxWidth + stadiumH / 4 + padding;
        adjustedHeight = stadiumH;
        break;

      case 'rect':
      case 'rounded':
      default:
        // From squareRect.ts/drawRect.ts:
        // labelPaddingX = padding * 2, labelPaddingY = padding * 1
        // totalWidth = bbox.width + labelPaddingX * 2 = bbox.width + padding * 4
        // totalHeight = bbox.height + labelPaddingY * 2 = bbox.height + padding * 2
        adjustedWidth = bboxWidth + padding * 4;
        adjustedHeight = bboxHeight + padding * 2;
        break;
    }

    return {
      x: 0,
      y: 0,
      width: adjustedWidth,
      height: adjustedHeight,
    };
  }
}
