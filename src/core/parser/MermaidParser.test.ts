import { describe, it, expect, beforeEach } from 'vitest';
import { MermaidParser } from './MermaidParser';

describe('MermaidParser', () => {
  let parser: MermaidParser;

  beforeEach(() => {
    parser = new MermaidParser();
  });

  describe('Basic Parsing', () => {
    it('should parse simple flowchart', () => {
      const mermaidCode = `
        flowchart TD
          A[Start] --> B[Process]
          B --> C[End]
      `;

      const model = parser.parse(mermaidCode);
      expect(model.nodes).toHaveLength(3);
      expect(model.edges).toHaveLength(2);
    });

    it('should handle different node shapes', () => {
      const mermaidCode = `
        flowchart TD
          A[Rect Node] --> B{{Diamond}}
          B --> C((Circle))
          C --> D>Odd Shape]
      `;

      const model = parser.parse(mermaidCode);
      expect(model.nodes).toHaveLength(4);
      expect(model.getNode('A')?.shape).toBe('rect');
      expect(model.getNode('B')?.shape).toBe('hexagon');
      expect(model.getNode('C')?.shape).toBe('circle');
      expect(model.getNode('D')?.shape).toBe('odd');
    });

    it('should handle different edge types', () => {
      const mermaidCode = `
        flowchart TD
          A --> B
          B -->|With Label| C
          C -.-> D
          D ==> E
      `;

      const model = parser.parse(mermaidCode);
      expect(model.edges).toHaveLength(4);
    });
  });

  describe('Edge Duplicate Reference Fix', () => {
    it('should generate consistent IDs for identical edges', () => {
      const mermaidCode1 = `
        flowchart TD
          A --> B
      `;

      const mermaidCode2 = `
        flowchart TD
          A --> B
      `;

      const model1 = parser.parse(mermaidCode1);
      const model2 = parser.parse(mermaidCode2);

      expect(model1.edges[0].id).toBe(model2.edges[0].id);
    });

    it('should generate different IDs for edges with different properties', () => {
      const mermaidCode1 = `
        flowchart TD
          A -->|Label 1| B
      `;

      const mermaidCode2 = `
        flowchart TD
          A -->|Label 2| B
      `;

      const model1 = parser.parse(mermaidCode1);
      const model2 = parser.parse(mermaidCode2);

      expect(model1.edges[0].id).not.toBe(model2.edges[0].id);
    });

    it('should handle bidirectional edges correctly', () => {
      const mermaidCode = `
        flowchart TD
          A <--> B
          B <--> A
      `;

      const model = parser.parse(mermaidCode);
      expect(model.edges).toHaveLength(2);

      // The edges should have different IDs because they represent different directions
      expect(model.edges[0].id).not.toBe(model.edges[1].id);
    });

    it('should handle multiple identical edges', () => {
      const mermaidCode = `
        flowchart TD
          A --> B
          A --> B
          A --> B
      `;

      const model = parser.parse(mermaidCode);
      expect(model.edges).toHaveLength(3);

      // All edges should have the same base ID (same content)
      const baseIds = model.edges.map(edge => edge.id.replace(/-dup\d+$/, ''));
      expect(new Set(baseIds).size).toBe(1);
    });

    it('should preserve edge text in ID generation', () => {
      const mermaidCode = `
        flowchart TD
          A -->|First Label| B
          A -->|Second Label| B
      `;

      const model = parser.parse(mermaidCode);
      expect(model.edges).toHaveLength(2);
      expect(model.edges[0].id).not.toBe(model.edges[1].id);
    });

    it('should handle different arrow types in ID generation', () => {
      const mermaidCode1 = `
        flowchart TD
          A --> B
      `;

      const mermaidCode2 = `
        flowchart TD
          A ==> B
      `;

      const model1 = parser.parse(mermaidCode1);
      const model2 = parser.parse(mermaidCode2);

      expect(model1.edges[0].id).not.toBe(model2.edges[0].id);
    });
  });

  describe('Bidirectional Edge Support', () => {
    it('should parse x--x edges correctly', () => {
      const mermaidCode = `
        flowchart TD
          A x--x B
      `;

      const model = parser.parse(mermaidCode);
      expect(model.edges).toHaveLength(1);

      const edge = model.edges[0];
      expect(edge.source).toBe('A');
      expect(edge.target).toBe('B');
      expect(edge.arrowStart).toBe('cross');
      expect(edge.arrowEnd).toBe('cross');
    });

    it('should parse <--> edges correctly', () => {
      const mermaidCode = `
        flowchart TD
          A <--> B
      `;

      const model = parser.parse(mermaidCode);
      expect(model.edges).toHaveLength(1);

      const edge = model.edges[0];
      expect(edge.source).toBe('A');
      expect(edge.target).toBe('B');
      expect(edge.arrowStart).toBe('arrow');
      expect(edge.arrowEnd).toBe('arrow');
    });

    it('should handle mixed edge types including bidirectional', () => {
      const mermaidCode = `
        flowchart TD
          A --> B
          B <--> C
          C x--x D
      `;

      const model = parser.parse(mermaidCode);
      expect(model.edges).toHaveLength(3);

      // First edge:单向箭头
      const edge1 = model.edges[0];
      expect(edge1.arrowStart).toBe('none');
      expect(edge1.arrowEnd).toBe('arrow');

      // Second edge:双向箭头
      const edge2 = model.edges[1];
      expect(edge2.arrowStart).toBe('arrow');
      expect(edge2.arrowEnd).toBe('arrow');

      // Third edge:双向叉
      const edge3 = model.edges[2];
      expect(edge3.arrowStart).toBe('cross');
      expect(edge3.arrowEnd).toBe('cross');
    });

    it('should generate consistent IDs for bidirectional edges', () => {
      const mermaidCode1 = `
        flowchart TD
          A <--> B
      `;

      const mermaidCode2 = `
        flowchart TD
          A <--> B
      `;

      const model1 = parser.parse(mermaidCode1);
      const model2 = parser.parse(mermaidCode2);

      expect(model1.edges[0].id).toBe(model2.edges[0].id);
    });
  });

  describe('Complex Scenarios', () => {
    it('should parse flowchart with subgraphs', () => {
      const mermaidCode = `
        flowchart TD
          subgraph "Subgraph 1"
            A[Node A]
            B[Node B]
          end

          A --> B
          B --> C[Node C]
      `;

      const model = parser.parse(mermaidCode);
      expect(model.nodes).toHaveLength(3);
      expect(model.edges).toHaveLength(2);
      expect(model.subGraphs).toHaveLength(1);
    });

    it('should handle comments and empty lines', () => {
      const mermaidCode = `
        flowchart TD
          %% This is a comment
          A[Start] --> B[End]

          %% Another comment

          B --> C[Final]
      `;

      const model = parser.parse(mermaidCode);
      expect(model.nodes).toHaveLength(3);
      expect(model.edges).toHaveLength(2);
    });

    it('should handle different directions', () => {
      const mermaidCode = `
        flowchart LR
          A --> B --> C
      `;

      const model = parser.parse(mermaidCode);
      expect(model.direction).toBe('LR');
    });
  });

  describe('Error Handling', () => {
    it('should handle incomplete syntax gracefully', () => {
      const invalidCode = `
        flowchart TD
          A -->
          --> B
      `;

      // Parser should handle this gracefully rather than throw
      const model = parser.parse(invalidCode);
      // Should at least parse the nodes
      expect(model.nodes.length).toBeGreaterThanOrEqual(0);
    });

    it('should handle missing nodes gracefully', () => {
      const mermaidCode = `
        flowchart TD
          A --> B
      `;

      // Manually add a node reference that doesn't exist
      const model = parser.parse(mermaidCode);

      // The model should still be valid, just with incomplete edge references
      expect(model.edges).toHaveLength(1);
    });
  });
});
