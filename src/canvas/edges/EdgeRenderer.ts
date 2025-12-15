import * as d3 from 'd3';
import { line, curveBasis } from 'd3';
import type { FlowEdge } from '../../core/model/Edge';
import type { BoundingBox, ArrowType, StrokeType } from '../../core/model/types';

/**
 * Mermaid default colors for edges
 */
const MERMAID_EDGE_COLOR = '#333333';
const MERMAID_EDGE_WIDTH = 2;

/**
 * Edge renderer - renders edges between nodes
 */
export class EdgeRenderer {
  private defs: d3.Selection<SVGDefsElement, unknown, null, undefined>;
  private markersCreated: Set<string> = new Set();

  constructor(defs: d3.Selection<SVGDefsElement, unknown, null, undefined>) {
    this.defs = defs;
    this.createDefaultMarkers();
  }

  /**
   * Create default arrow markers
   */
  private createDefaultMarkers(): void {
    // Arrow marker
    this.createArrowMarker('arrow-end', '#333333');
    this.createArrowMarker('arrow-start', '#333333', true);

    // Circle marker
    this.createCircleMarker('circle-end', '#333333');
    this.createCircleMarker('circle-start', '#333333');

    // Cross marker
    this.createCrossMarker('cross-end', '#333333');
    this.createCrossMarker('cross-start', '#333333');
  }

  /**
   * Create an arrow marker - matching Mermaid's style
   */
  private createArrowMarker(id: string, color: string, reverse = false): void {
    if (this.markersCreated.has(id)) return;

    const marker = this.defs
      .append('marker')
      .attr('id', id)
      .attr('viewBox', '0 0 10 10')
      .attr('refX', reverse ? 0 : 5)
      .attr('refY', 5)
      .attr('markerUnits', 'userSpaceOnUse')
      .attr('markerWidth', 8)
      .attr('markerHeight', 8)
      .attr('orient', 'auto');

    if (reverse) {
      marker
        .append('path')
        .attr('d', 'M 0 5 L 10 10 L 10 0 z')
        .attr('class', 'arrowMarkerPath')
        .style('stroke-width', 1)
        .style('stroke-dasharray', '1, 0')
        .attr('fill', color);
    } else {
      marker
        .append('path')
        .attr('d', 'M 0 0 L 10 5 L 0 10 z')
        .attr('class', 'arrowMarkerPath')
        .style('stroke-width', 1)
        .style('stroke-dasharray', '1, 0')
        .attr('fill', color);
    }

    this.markersCreated.add(id);
  }

  /**
   * Create a circle marker
   */
  private createCircleMarker(id: string, color: string): void {
    if (this.markersCreated.has(id)) return;

    this.defs
      .append('marker')
      .attr('id', id)
      .attr('viewBox', '-5 -5 10 10')
      .attr('refX', 0)
      .attr('refY', 0)
      .attr('markerWidth', 6)
      .attr('markerHeight', 6)
      .attr('orient', 'auto')
      .append('circle')
      .attr('cx', 0)
      .attr('cy', 0)
      .attr('r', 4)
      .attr('fill', color);

    this.markersCreated.add(id);
  }

  /**
   * Create a cross marker
   */
  private createCrossMarker(id: string, color: string): void {
    if (this.markersCreated.has(id)) return;

    const marker = this.defs
      .append('marker')
      .attr('id', id)
      .attr('viewBox', '-5 -5 10 10')
      .attr('refX', 0)
      .attr('refY', 0)
      .attr('markerWidth', 6)
      .attr('markerHeight', 6)
      .attr('orient', 'auto');

    marker
      .append('line')
      .attr('x1', -4)
      .attr('y1', -4)
      .attr('x2', 4)
      .attr('y2', 4)
      .attr('stroke', color)
      .attr('stroke-width', 2);

    marker
      .append('line')
      .attr('x1', -4)
      .attr('y1', 4)
      .attr('x2', 4)
      .attr('y2', -4)
      .attr('stroke', color)
      .attr('stroke-width', 2);

    this.markersCreated.add(id);
  }

  /**
   * Render an edge
   */
  render(
    group: d3.Selection<SVGGElement, unknown, null, undefined>,
    edge: FlowEdge,
    sourceBounds: BoundingBox,
    targetBounds: BoundingBox
  ): void {
    // Get style properties - use Mermaid defaults
    const strokeColor = edge.style?.stroke || MERMAID_EDGE_COLOR;
    const strokeWidth = edge.style?.strokeWidth || MERMAID_EDGE_WIDTH;

    // Calculate connection points from node bounds
    const { start, end } = this.calculateConnectionPoints(
      sourceBounds,
      targetBounds
    );

    // Create path - use Dagre points if available for better routing
    let path: string;
    if (edge.points && edge.points.length >= 2) {
      path = this.createPathFromPoints(edge.points);
    } else {
      path = this.createPath(start, end);
    }

    // Render the path
    const pathEl = group
      .append('path')
      .attr('d', path)
      .attr('fill', 'none')
      .attr('stroke', strokeColor)
      .attr('stroke-width', strokeWidth)
      .attr('class', 'edge-path flowchart-link');

    // Apply stroke style
    this.applyStrokeStyle(pathEl, edge.stroke);

    // Apply markers
    this.applyMarkers(pathEl, edge.arrowStart, edge.arrowEnd);

    // Render label if present
    if (edge.text) {
      this.renderLabel(group, edge.text, start, end);
    }

    // Apply animation if enabled
    if (edge.animate) {
      this.applyAnimation(pathEl, edge.animation);
    }
  }

  /**
   * Create a path from Dagre-calculated points using curveBasis
   */
  private createPathFromPoints(points: Array<{ x: number; y: number }>): string {
    if (points.length < 2) return '';

    const pointsArray: [number, number][] = points.map(p => [p.x, p.y]);

    const lineGenerator = line<[number, number]>()
      .x(d => d[0])
      .y(d => d[1])
      .curve(curveBasis);

    return lineGenerator(pointsArray) || '';
  }

  /**
   * Calculate connection points between two bounds
   */
  private calculateConnectionPoints(
    source: BoundingBox,
    target: BoundingBox
  ): { start: { x: number; y: number }; end: { x: number; y: number } } {
    // Calculate centers
    const sourceCenter = {
      x: source.x,
      y: source.y,
    };
    const targetCenter = {
      x: target.x,
      y: target.y,
    };

    // Calculate direction
    const dx = targetCenter.x - sourceCenter.x;
    const dy = targetCenter.y - sourceCenter.y;
    const angle = Math.atan2(dy, dx);

    // Calculate intersection with source bounds
    const start = this.getIntersectionPoint(sourceCenter, angle, source);

    // Calculate intersection with target bounds (opposite direction)
    const end = this.getIntersectionPoint(
      targetCenter,
      angle + Math.PI,
      target
    );

    return { start, end };
  }

  /**
   * Get intersection point of a ray from center with bounds
   */
  private getIntersectionPoint(
    center: { x: number; y: number },
    angle: number,
    bounds: BoundingBox
  ): { x: number; y: number } {
    const hw = bounds.width / 2;
    const hh = bounds.height / 2;

    // Calculate intersection with rectangle edges
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);

    let t: number;
    if (Math.abs(cos) * hh > Math.abs(sin) * hw) {
      // Intersects left or right edge
      t = hw / Math.abs(cos);
    } else {
      // Intersects top or bottom edge
      t = hh / Math.abs(sin);
    }

    return {
      x: center.x + cos * t,
      y: center.y + sin * t,
    };
  }

  /**
   * Create a path string between two points using D3 curveBasis (like Mermaid)
   */
  private createPath(
    start: { x: number; y: number },
    end: { x: number; y: number }
  ): string {
    // Calculate intermediate points for smooth curve
    const dx = end.x - start.x;
    const dy = end.y - start.y;

    // Create points array for the curve
    const points: [number, number][] = [];
    points.push([start.x, start.y]);

    // Add intermediate points based on direction
    if (Math.abs(dy) > Math.abs(dx)) {
      // Mostly vertical - add horizontal midpoint
      const midY = (start.y + end.y) / 2;
      points.push([start.x, midY]);
      points.push([end.x, midY]);
    } else {
      // Mostly horizontal - add vertical midpoint
      const midX = (start.x + end.x) / 2;
      points.push([midX, start.y]);
      points.push([midX, end.y]);
    }

    points.push([end.x, end.y]);

    // Use D3 line generator with curveBasis (matching Mermaid)
    const lineGenerator = line<[number, number]>()
      .x(d => d[0])
      .y(d => d[1])
      .curve(curveBasis);

    return lineGenerator(points) || '';
  }

  /**
   * Apply stroke style (normal, thick, dotted)
   */
  private applyStrokeStyle(
    path: d3.Selection<SVGPathElement, unknown, null, undefined>,
    stroke: StrokeType
  ): void {
    switch (stroke) {
      case 'thick':
        path.attr('stroke-width', 4);
        break;
      case 'dotted':
        path.attr('stroke-dasharray', '5,5');
        break;
      case 'invisible':
        path.attr('stroke-opacity', 0);
        break;
      case 'normal':
      default:
        // Default styling already applied
        break;
    }
  }

  /**
   * Apply arrow markers
   */
  private applyMarkers(
    path: d3.Selection<SVGPathElement, unknown, null, undefined>,
    arrowStart: ArrowType,
    arrowEnd: ArrowType
  ): void {
    if (arrowStart !== 'none') {
      path.attr('marker-start', `url(#${arrowStart}-start)`);
    }
    if (arrowEnd !== 'none') {
      path.attr('marker-end', `url(#${arrowEnd}-end)`);
    }
  }

  /**
   * Render edge label
   */
  private renderLabel(
    group: d3.Selection<SVGGElement, unknown, null, undefined>,
    text: string,
    start: { x: number; y: number },
    end: { x: number; y: number }
  ): void {
    const midX = (start.x + end.x) / 2;
    const midY = (start.y + end.y) / 2;

    // Background for label
    const padding = 4;
    const textWidth = text.length * 7 + padding * 2;
    const textHeight = 16 + padding * 2;

    // Ensure no existing label elements
    group.selectAll('.edge-label-bg').remove();
    group.selectAll('.edge-label').remove();

    group
      .append('rect')
      .attr('x', midX - textWidth / 2)
      .attr('y', midY - textHeight / 2)
      .attr('width', textWidth)
      .attr('height', textHeight)
      .attr('fill', '#ffffff')
      .attr('stroke', 'none')
      .attr('class', 'edge-label-bg');

    group
      .append('text')
      .attr('x', midX)
      .attr('y', midY)
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'central')
      .attr('fill', '#333333')
      .attr('font-size', '12px')
      .attr('font-family', 'sans-serif')
      .attr('class', 'edge-label')
      .text(text);
  }

  /**
   * Apply animation to edge
   */
  private applyAnimation(
    path: d3.Selection<SVGPathElement, unknown, null, undefined>,
    speed?: 'fast' | 'slow'
  ): void {
    const duration = speed === 'fast' ? '0.5s' : speed === 'slow' ? '2s' : '1s';

    path
      .attr('stroke-dasharray', '10,5')
      .style('animation', `dash ${duration} linear infinite`);
  }
}
