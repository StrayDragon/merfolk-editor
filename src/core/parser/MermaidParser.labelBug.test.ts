import { describe, it, expect, beforeEach } from 'vitest';
import { MermaidParser } from './MermaidParser';

describe('MermaidParser - Label Propagation Bug', () => {
  let parser: MermaidParser;

  beforeEach(() => {
    parser = new MermaidParser();
  });

  it('should not propagate labels between different edges', () => {
    const mermaidCode = `flowchart TB
      A[Start] --> B{Is it working?}
      B -->|Yes| C[Great!]
      B -->|No| D[Debug]
      D <--> B
      C --> E((End))
      F x--x G
      H <--> I`;

    const model = parser.parse(mermaidCode);

    console.log('\n=== All Edges ===');
    model.edges.forEach(edge => {
      console.log(`ID: ${edge.id}`);
      console.log(`  ${edge.source} -> ${edge.target}`);
      console.log(`  Text: ${edge.text || '(none)'}`);
      console.log(`  Arrow: ${edge.arrowStart} -> ${edge.arrowEnd}`);
      console.log('---');
    });

    // Find specific edges
    const bToD = model.edges.find(e => e.source === 'B' && e.target === 'D');
    const dToB = model.edges.find(e => e.source === 'D' && e.target === 'B');
    const hToI = model.edges.find(e => e.source === 'H' && e.target === 'I');
    const iToH = model.edges.find(e => e.source === 'I' && e.target === 'H');

    console.log('\n=== Edge B -> D ===');
    console.log('ID:', bToD?.id);
    console.log('Text:', bToD?.text);

    console.log('\n=== Edge D -> B ===');
    console.log('ID:', dToB?.id);
    console.log('Text:', dToB?.text);

    console.log('\n=== Edge H -> I ===');
    console.log('ID:', hToI?.id);
    console.log('Text:', hToI?.text);

    console.log('\n=== Edge I -> H ===');
    console.log('ID:', iToH?.id);
    console.log('Text:', iToH?.text);

    // Verify B -> D has "No" label
    expect(bToD?.text).toBe('No');
    expect(bToD?.id).not.toBe(hToI?.id);
    expect(bToD?.id).not.toBe(iToH?.id);

    // Verify H <-> I has NO label
    expect(hToI?.text).toBeUndefined();
    expect(iToH?.text).toBeUndefined();

    // All IDs should be unique
    const allIds = model.edges.map(e => e.id);
    const uniqueIds = new Set(allIds);
    expect(uniqueIds.size).toBe(allIds.length);

    console.log('\n✓ All edge IDs are unique');
    console.log('✓ B -> D has correct label "No"');
    console.log('✓ H <-> I has no label');
  });

  it('should verify edge ID generation includes all properties', () => {
    // Create two edges that differ only in text
    const mermaidCode1 = `flowchart TD
      A -->|Text1| B`;

    const model1 = parser.parse(mermaidCode1);
    const edge1 = model1.edges[0];

    const mermaidCode2 = `flowchart TD
      A -->|Text2| B`;

    const model2 = parser.parse(mermaidCode2);
    const edge2 = model2.edges[0];

    // They should have different IDs
    expect(edge1.id).not.toBe(edge2.id);
    expect(edge1.text).toBe('Text1');
    expect(edge2.text).toBe('Text2');

    console.log('\n✓ Edge with different text has different ID');
    console.log(`  Edge1 ID: ${edge1.id}, Text: ${edge1.text}`);
    console.log(`  Edge2 ID: ${edge2.id}, Text: ${edge2.text}`);
  });

  it('should verify H-I edge properties match the original code', () => {
    const mermaidCode = `flowchart TB
      H <--> I`;

    const model = parser.parse(mermaidCode);

    // Should have 1 bidirectional edge
    expect(model.edges).toHaveLength(1);

    const hToI = model.edges[0];

    expect(hToI.source).toBe('H');
    expect(hToI.target).toBe('I');
    expect(hToI.arrowStart).toBe('arrow');
    expect(hToI.arrowEnd).toBe('arrow');
    expect(hToI.text).toBeUndefined(); // No label

    console.log('\n✓ H <-> I edge properties:');
    console.log(`  ID: ${hToI.id}`);
    console.log(`  Source: ${hToI.source}`);
    console.log(`  Target: ${hToI.target}`);
    console.log(`  Arrow: ${hToI.arrowStart} -> ${hToI.arrowEnd}`);
    console.log(`  Text: ${hToI.text || '(none)'}`);
  });
});
