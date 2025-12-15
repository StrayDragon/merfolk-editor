import { describe, it, expect, beforeEach } from 'vitest';
import { MermaidParser } from './MermaidParser';

describe('MermaidParser - Reverse Edge Handling', () => {
  let parser: MermaidParser;

  beforeEach(() => {
    parser = new MermaidParser();
  });

  it('should correctly identify reverse edge pairs', () => {
    const mermaidCode = `
      flowchart TD
        A --> B
        B --> C
        C --> B
        C --> D
    `;

    const model = parser.parse(mermaidCode);
    expect(model.edges).toHaveLength(4);

    // 检查是否有成对的反向边
    const reversePairs: {forward: any, reverse: any}[] = [];
    const processedIds = new Set<string>();

    model.edges.forEach(edge => {
      if (processedIds.has(edge.id)) return;

      const reverseEdge = model.edges.find(e =>
        e.id !== edge.id &&
        e.source === edge.target &&
        e.target === edge.source &&
        !processedIds.has(e.id)
      );

      if (reverseEdge) {
        reversePairs.push({forward: edge, reverse: reverseEdge});
        processedIds.add(edge.id);
        processedIds.add(reverseEdge.id);
      }
    });

    expect(reversePairs).toHaveLength(1);
    expect(reversePairs[0].forward.source).toBe('B');
    expect(reversePairs[0].forward.target).toBe('C');
    expect(reversePairs[0].reverse.source).toBe('C');
    expect(reversePairs[0].reverse.target).toBe('B');
  });

  it('should distinguish between true bidirectional edges and reverse pairs', () => {
    const mermaidCode1 = `
      flowchart TD
        B <--> C
    `;

    const model1 = parser.parse(mermaidCode1);
    expect(model1.edges).toHaveLength(1);
    expect(model1.edges[0].arrowStart).toBe('arrow');
    expect(model1.edges[0].arrowEnd).toBe('arrow');

    const mermaidCode2 = `
      flowchart TD
        B --> C
        C --> B
    `;

    const model2 = parser.parse(mermaidCode2);
    expect(model2.edges).toHaveLength(2);

    // Both should be unidirectional edges
    expect(model2.edges[0].arrowStart).toBe('none');
    expect(model2.edges[0].arrowEnd).toBe('arrow');
    expect(model2.edges[1].arrowStart).toBe('none');
    expect(model2.edges[1].arrowEnd).toBe('arrow');
  });
});
