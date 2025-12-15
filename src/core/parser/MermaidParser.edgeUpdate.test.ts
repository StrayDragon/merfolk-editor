import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MermaidParser } from './MermaidParser';
import { FlowchartModel } from '../model/FlowchartModel';

describe('MermaidParser - Edge Update During Node Drag', () => {
  let parser: MermaidParser;

  beforeEach(() => {
    parser = new MermaidParser();
  });

  it('should correctly parse edges that will be updated during node drag', () => {
    const mermaidCode = `flowchart TB
      A[Start] --> B{Is it working?}
      B -->|Yes| C[Great!]
      B -->|No| D[Debug]
      D <--> B
      C --> E((End))`;

    const model = parser.parse(mermaidCode);

    // Verify all nodes are present
    expect(model.nodes).toHaveLength(5);
    expect(model.hasNode('A')).toBe(true);
    expect(model.hasNode('B')).toBe(true);
    expect(model.hasNode('C')).toBe(true);
    expect(model.hasNode('D')).toBe(true);
    expect(model.hasNode('E')).toBe(true);

    // Verify all edges are present
    expect(model.edges).toHaveLength(5);

    // Find the specific edges between B and D
    const bToD = model.edges.find(e => e.source === 'B' && e.target === 'D');
    const dToB = model.edges.find(e => e.source === 'D' && e.target === 'B');

    // B --> D should be a single-direction edge with label "No"
    expect(bToD).toBeDefined();
    expect(bToD?.arrowStart).toBe('none');
    expect(bToD?.arrowEnd).toBe('arrow');
    expect(bToD?.text).toBe('No');

    // D <--> B should be a bidirectional edge
    expect(dToB).toBeDefined();
    expect(dToB?.arrowStart).toBe('arrow');
    expect(dToB?.arrowEnd).toBe('arrow');
    expect(dToB?.text).toBeUndefined();

    // They should have different IDs
    expect(bToD?.id).not.toBe(dToB?.id);

    console.log('✓ Edge B --> D:', bToD);
    console.log('✓ Edge D <--> B:', dToB);
  });

  it('should maintain edge count and properties after model operations', () => {
    const mermaidCode = `flowchart TD
      A --> B
      B --> C
      C --> B`;

    const model = parser.parse(mermaidCode);

    // Initial state
    expect(model.edges).toHaveLength(3);

    // Simulate what happens during node drag - get edges for node B
    // B has 3 edges connected: A->B, B->C, C->B
    const edgesForB = model.getEdgesForNode('B');
    expect(edgesForB).toHaveLength(3);

    // All edges should still be in the model
    expect(model.edges).toHaveLength(3);

    // Verify edge properties are preserved
    const bToC = model.edges.find(e => e.source === 'B' && e.target === 'C');
    const cToB = model.edges.find(e => e.source === 'C' && e.target === 'B');

    expect(bToC?.arrowStart).toBe('none');
    expect(bToC?.arrowEnd).toBe('arrow');
    expect(cToB?.arrowStart).toBe('none');
    expect(cToB?.arrowEnd).toBe('arrow');
  });

  it('should correctly handle complex bidirectional scenarios', () => {
    const mermaidCode = `flowchart LR
      A <--> B
      B --> C
      C <--> D
      D --> A`;

    const model = parser.parse(mermaidCode);

    // Count edges
    expect(model.edges).toHaveLength(4);

    // A <--> B: This creates ONE bidirectional edge from A to B
    const aToB = model.edges.find(e => e.source === 'A' && e.target === 'B');
    expect(aToB).toBeDefined();
    expect(aToB?.arrowStart).toBe('arrow');
    expect(aToB?.arrowEnd).toBe('arrow');

    // B --> C: single direction
    const bToC = model.edges.find(e => e.source === 'B' && e.target === 'C');
    expect(bToC?.arrowStart).toBe('none');
    expect(bToC?.arrowEnd).toBe('arrow');

    // C <--> D: ONE bidirectional edge from C to D
    const cToD = model.edges.find(e => e.source === 'C' && e.target === 'D');
    expect(cToD).toBeDefined();
    expect(cToD?.arrowStart).toBe('arrow');
    expect(cToD?.arrowEnd).toBe('arrow');

    // D --> A: single direction
    const dToA = model.edges.find(e => e.source === 'D' && e.target === 'A');
    expect(dToA?.arrowStart).toBe('none');
    expect(dToA?.arrowEnd).toBe('arrow');
  });

  it('should handle multiple edges between same nodes correctly', () => {
    const mermaidCode = `flowchart TD
      A --> B
      A --> B
      B <--> A`;

    const model = parser.parse(mermaidCode);

    // Should have 3 distinct edges
    expect(model.edges).toHaveLength(3);

    // Count edges between A and B
    const aToB = model.edges.filter(e => e.source === 'A' && e.target === 'B');
    const bToA = model.edges.filter(e => e.source === 'B' && e.target === 'A');

    // A --> B appears twice, B <--> A is bidirectional
    expect(aToB).toHaveLength(2);
    expect(bToA).toHaveLength(1);

    // All should have different IDs
    const edgeIds = model.edges.map(e => e.id);
    const uniqueIds = new Set(edgeIds);
    expect(uniqueIds.size).toBe(3);
  });
});
