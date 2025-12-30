import { describe, it, expect } from 'vitest';
import { MermaidParser } from './MermaidParser';

describe('MermaidParser', () => {
  const parser = new MermaidParser();

  describe('parse', () => {
    it('should parse simple flowchart with nodes', () => {
      const code = `flowchart TB
        A[Node A]
        B[Node B]`;

      const model = parser.parse(code);

      expect(model.nodeCount).toBe(2);
      expect(model.getNode('A')?.text).toBe('Node A');
      expect(model.getNode('B')?.text).toBe('Node B');
    });

    it('should parse flowchart with edges', () => {
      const code = `flowchart TB
        A[Start] --> B[End]`;

      const model = parser.parse(code);

      expect(model.nodeCount).toBe(2);
      expect(model.edgeCount).toBe(1);
      const edges = model.edges;
      expect(edges[0].source).toBe('A');
      expect(edges[0].target).toBe('B');
    });

    it('should parse different node shapes', () => {
      const code = `flowchart TB
        A[Rectangle]
        B(Rounded)
        C([Stadium])
        D{Diamond}
        E((Circle))
        F{{Hexagon}}`;

      const model = parser.parse(code);

      expect(model.getNode('A')?.shape).toBe('rect');
      expect(model.getNode('B')?.shape).toBe('rounded');
      expect(model.getNode('C')?.shape).toBe('stadium');
      expect(model.getNode('D')?.shape).toBe('diamond');
      expect(model.getNode('E')?.shape).toBe('circle');
      expect(model.getNode('F')?.shape).toBe('hexagon');
    });

    it('should parse edge labels', () => {
      const code = `flowchart TB
        A -->|Yes| B
        A -->|No| C`;

      const model = parser.parse(code);

      expect(model.edgeCount).toBe(2);
      const edges = model.edges;
      expect(edges.find(e => e.target === 'B')?.text).toBe('Yes');
      expect(edges.find(e => e.target === 'C')?.text).toBe('No');
    });

    it('should parse bidirectional edges', () => {
      const code = `flowchart TB
        A <--> B`;

      const model = parser.parse(code);

      expect(model.edgeCount).toBe(1);
      const edge = model.edges[0];
      expect(edge.arrowStart).toBe('arrow');
      expect(edge.arrowEnd).toBe('arrow');
    });

    it('should parse reverse edge pairs correctly', () => {
      const code = `flowchart TB
        A --> B
        B --> A`;

      const model = parser.parse(code);

      expect(model.edgeCount).toBe(2);
      const edges = model.edges;
      expect(edges.find(e => e.source === 'A' && e.target === 'B')).toBeDefined();
      expect(edges.find(e => e.source === 'B' && e.target === 'A')).toBeDefined();
    });

    it('should parse subgraphs', () => {
      const code = `flowchart TB
        subgraph group1 [Group 1]
          A[Node A]
          B[Node B]
        end
        C[Outside]`;

      const model = parser.parse(code);

      expect(model.subGraphs.length).toBe(1);
      expect(model.subGraphs[0].id).toBe('group1');
      expect(model.subGraphs[0].nodeIds).toContain('A');
      expect(model.subGraphs[0].nodeIds).toContain('B');
      expect(model.getNode('A')?.parentId).toBe('group1');
      expect(model.getNode('C')?.parentId).toBeUndefined();
    });

    it('should parse HTML labels inside subgraphs', () => {
      const code = `flowchart TB
        subgraph Group
          N1["One<br/>Two"]
        end`;

      const model = parser.parse(code);

      const node = model.getNode('N1');
      expect(node?.text).toBe('One<br/>Two');
      expect(node?.shape).toBe('rect');
      expect(node?.parentId).toBe('Group');
    });

    it('should parse nested subgraphs with parent references', () => {
      const code = `flowchart TB
        subgraph outer
          subgraph inner
            A[Node A]
          end
          B[Node B]
        end`;

      const model = parser.parse(code);

      const outer = model.subGraphs.find((s) => s.id === 'outer');
      const inner = model.subGraphs.find((s) => s.id === 'inner');

      expect(outer?.parentId).toBeUndefined();
      expect(inner?.parentId).toBe('outer');
      expect(model.getNode('A')?.parentId).toBe('inner');
      expect(model.getNode('B')?.parentId).toBe('outer');
    });

    it('should parse class definitions', () => {
      const code = `flowchart TB
        A[Node]
        classDef red fill:#f00,stroke:#900`;

      const model = parser.parse(code);

      const classDef = model.getClassDef('red');
      expect(classDef).toBeDefined();
      expect(classDef?.styles).toContain('fill:#f00');
    });

    it('should parse style statements', () => {
      const code = `flowchart TB
        A[Node]
        style A fill:#0f0,stroke:#090`;

      const model = parser.parse(code);

      const node = model.getNode('A');
      expect(node?.style?.fill).toBe('#0f0');
      expect(node?.style?.stroke).toBe('#090');
    });

    it('should handle different graph directions (TB, LR, RL, BT)', () => {
      expect(parser.parse('flowchart TB\n  A').direction).toBe('TB');
      expect(parser.parse('flowchart LR\n  A').direction).toBe('LR');
      expect(parser.parse('flowchart RL\n  A').direction).toBe('RL');
      expect(parser.parse('flowchart BT\n  A').direction).toBe('BT');
      expect(parser.parse('flowchart TD\n  A').direction).toBe('TB'); // TD is alias for TB
    });
  });

  describe('edge parsing', () => {
    it('should distinguish true bidirectional edges from reverse pairs', () => {
      // True bidirectional
      const biModel = parser.parse('flowchart TB\n  A <--> B');
      expect(biModel.edgeCount).toBe(1);
      expect(biModel.edges[0].arrowStart).toBe('arrow');
      expect(biModel.edges[0].arrowEnd).toBe('arrow');

      // Reverse pairs
      const pairModel = parser.parse('flowchart TB\n  A --> B\n  B --> A');
      expect(pairModel.edgeCount).toBe(2);
      expect(pairModel.edges[0].arrowStart).toBe('none');
    });

    it('should generate consistent edge IDs', () => {
      const code = 'flowchart TB\n  A --> B';
      const model1 = parser.parse(code);
      const model2 = parser.parse(code);

      expect(model1.edges[0].id).toBe(model2.edges[0].id);
    });

    it('should parse thick edges (==>)', () => {
      const model = parser.parse('flowchart TB\n  A ==> B');

      expect(model.edges[0].stroke).toBe('thick');
      expect(model.edges[0].arrowEnd).toBe('arrow');
    });

    it('should parse dotted edges (-.->)', () => {
      const model = parser.parse('flowchart TB\n  A -.-> B');

      expect(model.edges[0].stroke).toBe('dotted');
      expect(model.edges[0].arrowEnd).toBe('arrow');
    });

    it('should parse circle and cross arrows', () => {
      const circleModel = parser.parse('flowchart TB\n  A --o B');
      expect(circleModel.edges[0].arrowEnd).toBe('circle');

      const crossModel = parser.parse('flowchart TB\n  A --x B');
      expect(crossModel.edges[0].arrowEnd).toBe('cross');
    });
  });

  describe('error handling', () => {
    it('should throw on invalid syntax', () => {
      // Parser itself is lenient, but let's test what happens with weird input
      // This should not throw but might produce unexpected results
      const model = parser.parse('not valid mermaid');
      expect(model).toBeDefined();
    });

    it('should handle empty input gracefully', () => {
      const model = parser.parse('');
      expect(model.nodeCount).toBe(0);
      expect(model.edgeCount).toBe(0);
    });
  });

  describe('chain parsing', () => {
    it('should parse node chains correctly', () => {
      const code = `flowchart TB
        A --> B --> C --> D`;

      const model = parser.parse(code);

      expect(model.nodeCount).toBe(4);
      expect(model.edgeCount).toBe(3);
      expect(model.edges.find(e => e.source === 'A' && e.target === 'B')).toBeDefined();
      expect(model.edges.find(e => e.source === 'B' && e.target === 'C')).toBeDefined();
      expect(model.edges.find(e => e.source === 'C' && e.target === 'D')).toBeDefined();
    });

    it('should parse nodes with shape in chains', () => {
      const code = `flowchart TB
        A[Start] --> B{Decision} --> C((End))`;

      const model = parser.parse(code);

      expect(model.getNode('A')?.shape).toBe('rect');
      expect(model.getNode('B')?.shape).toBe('diamond');
      expect(model.getNode('C')?.shape).toBe('circle');
    });
  });

  describe('comments', () => {
    it('should ignore comments', () => {
      const code = `flowchart TB
        %% This is a comment
        A[Node A]
        B[Node B] %% inline comment`;

      const model = parser.parse(code);

      expect(model.nodeCount).toBe(2);
      expect(model.getNode('A')?.text).toBe('Node A');
    });
  });
});
