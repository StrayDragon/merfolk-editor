import { describe, it, expect } from 'vitest';
import { MermaidSerializer } from './MermaidSerializer';
import { MermaidParser } from '../parser/MermaidParser';
import { FlowchartModel } from '../model/FlowchartModel';

describe('MermaidSerializer', () => {
  const serializer = new MermaidSerializer();
  const parser = new MermaidParser();

  describe('serialize', () => {
    it('should serialize empty model', () => {
      const model = new FlowchartModel();

      const output = serializer.serialize(model);

      expect(output).toBe('flowchart TB');
    });

    it('should serialize model with nodes', () => {
      const model = new FlowchartModel();
      model.addNode({ id: 'A', text: 'Node A', shape: 'rect' });
      model.addNode({ id: 'B', text: 'Node B', shape: 'rect' });

      const output = serializer.serialize(model);

      expect(output).toContain('A[Node A]');
      expect(output).toContain('B[Node B]');
    });

    it('should serialize model with edges', () => {
      const model = new FlowchartModel();
      model.addNode({ id: 'A', text: 'A', shape: 'rect' });
      model.addNode({ id: 'B', text: 'B', shape: 'rect' });
      model.addEdge({
        id: 'e1',
        source: 'A',
        target: 'B',
        stroke: 'normal',
        arrowStart: 'none',
        arrowEnd: 'arrow'
      });

      const output = serializer.serialize(model);

      expect(output).toContain('A --> B');
    });

    it('should serialize different node shapes correctly', () => {
      const model = new FlowchartModel();
      model.addNode({ id: 'A', text: 'Rect', shape: 'rect' });
      model.addNode({ id: 'B', text: 'Round', shape: 'rounded' });
      model.addNode({ id: 'C', text: 'Diamond', shape: 'diamond' });
      model.addNode({ id: 'D', text: 'Circle', shape: 'circle' });
      model.addNode({ id: 'E', text: 'Stadium', shape: 'stadium' });
      model.addNode({ id: 'F', text: 'Hex', shape: 'hexagon' });

      const output = serializer.serialize(model);

      expect(output).toContain('A[Rect]');
      expect(output).toContain('B(Round)');
      expect(output).toContain('C{Diamond}');
      expect(output).toContain('D((Circle))');
      expect(output).toContain('E([Stadium])');
      expect(output).toContain('F{{Hex}}');
    });

    it('should serialize edge labels with pipe syntax', () => {
      const model = new FlowchartModel();
      model.addNode({ id: 'A', text: 'A', shape: 'rect' });
      model.addNode({ id: 'B', text: 'B', shape: 'rect' });
      model.addEdge({
        id: 'e1',
        source: 'A',
        target: 'B',
        text: 'Yes',
        stroke: 'normal',
        arrowStart: 'none',
        arrowEnd: 'arrow'
      });

      const output = serializer.serialize(model);

      // Correct Mermaid syntax: -->|text| (pipe after arrow)
      expect(output).toContain('A -->|Yes| B');
    });

    it('should serialize user-defined edge IDs', () => {
      const model = new FlowchartModel();
      model.addNode({ id: 'A', text: 'A', shape: 'rect' });
      model.addNode({ id: 'B', text: 'B', shape: 'rect' });
      model.addEdge({
        id: 'e1',
        source: 'A',
        target: 'B',
        stroke: 'normal',
        arrowStart: 'none',
        arrowEnd: 'arrow',
        isUserDefinedId: true
      });

      const output = serializer.serialize(model);

      expect(output).toContain('A e1@--> B');
    });

    it('should serialize edge length for normal arrows', () => {
      const model = new FlowchartModel();
      model.addNode({ id: 'A', text: 'A', shape: 'rect' });
      model.addNode({ id: 'B', text: 'B', shape: 'rect' });
      model.addEdge({
        id: 'e1',
        source: 'A',
        target: 'B',
        stroke: 'normal',
        arrowStart: 'none',
        arrowEnd: 'arrow',
        length: 3
      });

      const output = serializer.serialize(model);

      expect(output).toContain('A ----> B');
    });

    it('should serialize linkStyle for edge styles', () => {
      const model = new FlowchartModel();
      model.addNode({ id: 'A', text: 'A', shape: 'rect' });
      model.addNode({ id: 'B', text: 'B', shape: 'rect' });
      model.addEdge({
        id: 'e1',
        source: 'A',
        target: 'B',
        stroke: 'normal',
        arrowStart: 'none',
        arrowEnd: 'arrow',
        style: { stroke: '#f00', strokeWidth: 4 }
      });

      const output = serializer.serialize(model);

      expect(output).toContain('linkStyle 0 stroke:#f00,stroke-width:4px');
    });

    it('should serialize edge animation properties', () => {
      const model = new FlowchartModel();
      model.addNode({ id: 'A', text: 'A', shape: 'rect' });
      model.addNode({ id: 'B', text: 'B', shape: 'rect' });
      model.addEdge({
        id: 'e1',
        source: 'A',
        target: 'B',
        stroke: 'normal',
        arrowStart: 'none',
        arrowEnd: 'arrow',
        isUserDefinedId: true,
        animate: true
      });

      const output = serializer.serialize(model);

      expect(output).toContain('A e1@--> B');
      expect(output).toContain('e1@{ animate: true }');
    });

    it('should serialize bidirectional edges', () => {
      const model = new FlowchartModel();
      model.addNode({ id: 'A', text: 'A', shape: 'rect' });
      model.addNode({ id: 'B', text: 'B', shape: 'rect' });
      model.addEdge({
        id: 'e1',
        source: 'A',
        target: 'B',
        stroke: 'normal',
        arrowStart: 'arrow',
        arrowEnd: 'arrow'
      });

      const output = serializer.serialize(model);

      expect(output).toContain('A <--> B');
    });

    it('should serialize subgraphs', () => {
      const model = new FlowchartModel();
      model.addSubGraph({ id: 'sg1', title: 'Group 1', nodeIds: ['A', 'B'] });
      model.addNode({ id: 'A', text: 'A', shape: 'rect', parentId: 'sg1' });
      model.addNode({ id: 'B', text: 'B', shape: 'rect', parentId: 'sg1' });
      model.addNode({ id: 'C', text: 'C', shape: 'rect' });

      const output = serializer.serialize(model);

      expect(output).toContain('subgraph sg1[Group 1]');
      expect(output).toContain('end');
    });

    it('should serialize nested subgraphs', () => {
      const model = new FlowchartModel();
      model.addSubGraph({ id: 'outer', title: 'Outer', nodeIds: ['A'] });
      model.addSubGraph({ id: 'inner', title: 'Inner', nodeIds: ['B'], parentId: 'outer' });
      model.addNode({ id: 'A', text: 'A', shape: 'rect', parentId: 'outer' });
      model.addNode({ id: 'B', text: 'B', shape: 'rect', parentId: 'inner' });

      const output = serializer.serialize(model);
      const lines = output.split('\n');
      const outerIndex = lines.findIndex((line) => line.includes('subgraph outer'));
      const innerIndex = lines.findIndex((line) => line.includes('subgraph inner'));

      expect(outerIndex).toBeGreaterThan(-1);
      expect(innerIndex).toBeGreaterThan(outerIndex);
      expect(lines[innerIndex].startsWith('        subgraph inner')).toBe(true);
    });

    it('should serialize class definitions', () => {
      const model = new FlowchartModel();
      model.addNode({ id: 'A', text: 'A', shape: 'rect' });
      model.defineClass('red', ['fill:#f00', 'stroke:#900']);

      const output = serializer.serialize(model);

      expect(output).toContain('classDef red fill:#f00,stroke:#900');
    });

    it('should serialize style statements', () => {
      const model = new FlowchartModel();
      model.addNode({
        id: 'A',
        text: 'A',
        shape: 'rect',
        style: { fill: '#0f0', stroke: '#090' }
      });

      const output = serializer.serialize(model);

      expect(output).toContain('style A fill:#0f0,stroke:#090');
    });

    it('should serialize click/link statements', () => {
      const model = new FlowchartModel();
      model.addNode({
        id: 'A',
        text: 'A',
        shape: 'rect',
        link: 'https://example.com',
        linkTarget: '_blank'
      });

      const output = serializer.serialize(model);

      expect(output).toContain('click A "https://example.com" "_blank"');
    });
  });

  describe('edge operators', () => {
    it('should generate correct operator for normal arrows', () => {
      const model = new FlowchartModel();
      model.addNode({ id: 'A', text: 'A', shape: 'rect' });
      model.addNode({ id: 'B', text: 'B', shape: 'rect' });
      model.addEdge({
        id: 'e1',
        source: 'A',
        target: 'B',
        stroke: 'normal',
        arrowStart: 'none',
        arrowEnd: 'arrow'
      });

      const output = serializer.serialize(model);

      expect(output).toContain('-->');
    });

    it('should generate correct operator for thick arrows', () => {
      const model = new FlowchartModel();
      model.addNode({ id: 'A', text: 'A', shape: 'rect' });
      model.addNode({ id: 'B', text: 'B', shape: 'rect' });
      model.addEdge({
        id: 'e1',
        source: 'A',
        target: 'B',
        stroke: 'thick',
        arrowStart: 'none',
        arrowEnd: 'arrow'
      });

      const output = serializer.serialize(model);

      expect(output).toContain('==>');
    });

    it('should generate correct operator for dotted arrows', () => {
      const model = new FlowchartModel();
      model.addNode({ id: 'A', text: 'A', shape: 'rect' });
      model.addNode({ id: 'B', text: 'B', shape: 'rect' });
      model.addEdge({
        id: 'e1',
        source: 'A',
        target: 'B',
        stroke: 'dotted',
        arrowStart: 'none',
        arrowEnd: 'arrow'
      });

      const output = serializer.serialize(model);

      expect(output).toContain('-.->');
    });

    it('should include text labels in operators', () => {
      const model = new FlowchartModel();
      model.addNode({ id: 'A', text: 'A', shape: 'rect' });
      model.addNode({ id: 'B', text: 'B', shape: 'rect' });
      model.addEdge({
        id: 'e1',
        source: 'A',
        target: 'B',
        text: 'label',
        stroke: 'thick',
        arrowStart: 'none',
        arrowEnd: 'arrow'
      });

      const output = serializer.serialize(model);

      expect(output).toContain('|label|');
    });
  });

  describe('roundtrip', () => {
    it('should produce consistent output when parsing and re-serializing', () => {
      const originalCode = `flowchart TB
    A[Start]
    B{Decision}
    C((End))

    A --> B
    B -->|Yes| C`;

      const model = parser.parse(originalCode);
      const serialized = serializer.serialize(model);
      const reparsed = parser.parse(serialized);

      // Key nodes should be preserved with correct properties
      expect(reparsed.getNode('A')?.text).toBe('Start');
      expect(reparsed.getNode('B')?.shape).toBe('diamond');
      expect(reparsed.getNode('C')?.shape).toBe('circle');

      // Edge count should be same or greater (edge serialization may create implicit nodes)
      expect(reparsed.edgeCount).toBeGreaterThanOrEqual(model.edgeCount);
    });

    it('should preserve edge labels through roundtrip', () => {
      const originalCode = `flowchart TB
    A --> B
    A -->|condition| C`;

      const model = parser.parse(originalCode);
      const serialized = serializer.serialize(model);
      const reparsed = parser.parse(serialized);

      const edgeWithLabel = reparsed.edges.find(e => e.text === 'condition');
      expect(edgeWithLabel).toBeDefined();
    });

    it('should roundtrip subgraph titles with quotes and unicode', () => {
      const originalCode = `flowchart TB
    subgraph Users["👤 用户(需求方)"]
      A[Node A]
    end

    subgraph Channels["📡 通道层"]
      direction LR
      B[Node B]
      C[Node C]
    end

    Users --> Channels
    B --> C`;

      const model = parser.parse(originalCode);
      const serialized = serializer.serialize(model);

      expect(serialized).toContain('subgraph Users["👤 用户(需求方)"]');
      expect(() => parser.parse(serialized)).not.toThrow();
    });
  });

  describe('node text simplification', () => {
    it('should output plain ID when text equals ID and shape is rect', () => {
      const model = new FlowchartModel();
      model.addNode({ id: 'A', text: 'A', shape: 'rect' });

      const output = serializer.serialize(model);

      expect(output).toContain('A');
      expect(output).not.toContain('A[A]');
    });

    it('should output full syntax when text differs from ID', () => {
      const model = new FlowchartModel();
      model.addNode({ id: 'A', text: 'Different Text', shape: 'rect' });

      const output = serializer.serialize(model);

      expect(output).toContain('A[Different Text]');
    });
  });

  describe('special character escaping', () => {
    it('should use quoted text for node text with parentheses', () => {
      const model = new FlowchartModel();
      model.addNode({ id: 'A', text: 'Text (with parens)', shape: 'rect' });

      const output = serializer.serialize(model);

      expect(output).toContain('A["Text (with parens)"]');
    });

    it('should use quoted text for node text with brackets', () => {
      const model = new FlowchartModel();
      model.addNode({ id: 'A', text: 'Text [with brackets]', shape: 'rect' });

      const output = serializer.serialize(model);

      expect(output).toContain('A["Text [with brackets]"]');
    });

    it('should use markdown string for markdown formatting', () => {
      const model = new FlowchartModel();
      model.addNode({ id: 'A', text: 'This **is** _Markdown_', shape: 'rect' });

      const output = serializer.serialize(model);

      expect(output).toContain('A["`This **is** _Markdown_`"]');
    });

    it('should quote unicode text', () => {
      const model = new FlowchartModel();
      model.addNode({ id: 'A', text: '中文内容', shape: 'rect' });

      const output = serializer.serialize(model);

      expect(output).toContain('A["中文内容"]');
    });

    it('should keep HTML line breaks in quoted text', () => {
      const model = new FlowchartModel();
      model.addNode({ id: 'A', text: 'Line1<br/>Line2', shape: 'rect' });

      const output = serializer.serialize(model);

      expect(output).toContain('A["Line1<br/>Line2"]');
    });

    it('should escape double quotes in node text', () => {
      const model = new FlowchartModel();
      model.addNode({ id: 'A', text: 'Text "quoted"', shape: 'rect' });

      const output = serializer.serialize(model);

      expect(output).toContain('A["Text #quot;quoted#quot;"]');
    });

    it('should normalize mixed quote encodings in node text', () => {
      const model = new FlowchartModel();
      model.addNode({ id: 'A', text: 'Text #quot;quoted"', shape: 'rect' });

      const output = serializer.serialize(model);

      expect(output).toContain('A["Text #quot;quoted#quot;"]');
    });

    it('should escape pipes in edge labels', () => {
      const model = new FlowchartModel();
      model.addNode({ id: 'A', text: 'A', shape: 'rect' });
      model.addNode({ id: 'B', text: 'B', shape: 'rect' });
      model.addEdge({
        id: 'e1',
        source: 'A',
        target: 'B',
        text: 'a|b',
        stroke: 'normal',
        arrowStart: 'none',
        arrowEnd: 'arrow'
      });

      const output = serializer.serialize(model);

      expect(output).toContain('a#124;b');
    });

    it('should handle diamond shape with conflicting text', () => {
      const model = new FlowchartModel();
      model.addNode({ id: 'A', text: 'Is {valid}?', shape: 'diamond' });

      const output = serializer.serialize(model);

      expect(output).toContain('A{"Is {valid}?"}');
    });

    it('should keep backticks in quoted text', () => {
      const model = new FlowchartModel();
      model.addNode({ id: 'A', text: 'Code `example`', shape: 'rect' });

      const output = serializer.serialize(model);

      expect(output).toContain('A["Code `example`"]');
    });
  });
});
