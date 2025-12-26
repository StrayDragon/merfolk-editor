import { describe, it, expect } from 'vitest';
import {
  detectDiagramType,
  isEditableFlowchart,
  getAllDiagramTypes,
} from './DiagramTypeDetector';

describe('DiagramTypeDetector', () => {
  describe('detectDiagramType', () => {
    describe('flowchart detection', () => {
      it('should detect flowchart TB', () => {
        const result = detectDiagramType('flowchart TB\n  A --> B');
        expect(result.type).toBe('flowchart');
        expect(result.isEditable).toBe(true);
      });

      it('should detect flowchart LR', () => {
        const result = detectDiagramType('flowchart LR\n  A --> B');
        expect(result.type).toBe('flowchart');
      });

      it('should detect graph TD', () => {
        const result = detectDiagramType('graph TD\n  A --> B');
        expect(result.type).toBe('flowchart');
        expect(result.isEditable).toBe(true);
      });

      it('should handle frontmatter', () => {
        const code = `---
title: My Flowchart
---
flowchart TB
  A --> B`;
        const result = detectDiagramType(code);
        expect(result.type).toBe('flowchart');
      });

      it('should handle leading whitespace', () => {
        const result = detectDiagramType('  flowchart TB\n  A --> B');
        expect(result.type).toBe('flowchart');
      });
    });

    describe('sequence diagram detection', () => {
      it('should detect sequenceDiagram', () => {
        const result = detectDiagramType('sequenceDiagram\n  Alice->>Bob: Hello');
        expect(result.type).toBe('sequenceDiagram');
        expect(result.isEditable).toBe(false);
      });
    });

    describe('class diagram detection', () => {
      it('should detect classDiagram', () => {
        const result = detectDiagramType('classDiagram\n  Animal <|-- Dog');
        expect(result.type).toBe('classDiagram');
        expect(result.isEditable).toBe(false);
      });
    });

    describe('state diagram detection', () => {
      it('should detect stateDiagram', () => {
        const result = detectDiagramType('stateDiagram\n  [*] --> Still');
        expect(result.type).toBe('stateDiagram');
        expect(result.isEditable).toBe(false);
      });

      it('should detect stateDiagram-v2', () => {
        const result = detectDiagramType('stateDiagram-v2\n  [*] --> Still');
        expect(result.type).toBe('stateDiagram');
      });
    });

    describe('ER diagram detection', () => {
      it('should detect erDiagram', () => {
        const result = detectDiagramType('erDiagram\n  CUSTOMER ||--o{ ORDER : places');
        expect(result.type).toBe('erDiagram');
        expect(result.isEditable).toBe(false);
      });
    });

    describe('gantt detection', () => {
      it('should detect gantt', () => {
        const result = detectDiagramType('gantt\n  title A Gantt Diagram');
        expect(result.type).toBe('gantt');
        expect(result.isEditable).toBe(false);
      });
    });

    describe('pie chart detection', () => {
      it('should detect pie', () => {
        const result = detectDiagramType('pie\n  "Dogs" : 386');
        expect(result.type).toBe('pie');
        expect(result.isEditable).toBe(false);
      });
    });

    describe('mindmap detection', () => {
      it('should detect mindmap', () => {
        const result = detectDiagramType('mindmap\n  root((mindmap))');
        expect(result.type).toBe('mindmap');
        expect(result.isEditable).toBe(false);
      });
    });

    describe('git graph detection', () => {
      it('should detect gitGraph', () => {
        const result = detectDiagramType('gitGraph\n  commit');
        expect(result.type).toBe('gitGraph');
        expect(result.isEditable).toBe(false);
      });
    });

    describe('C4 diagram detection', () => {
      it('should detect C4Context', () => {
        const result = detectDiagramType('C4Context\n  title System Context');
        expect(result.type).toBe('c4');
        expect(result.isEditable).toBe(false);
      });

      it('should detect C4Container', () => {
        const result = detectDiagramType('C4Container\n  title Container');
        expect(result.type).toBe('c4');
      });
    });

    describe('unknown type', () => {
      it('should return unknown for empty code', () => {
        const result = detectDiagramType('');
        expect(result.type).toBe('unknown');
        expect(result.isEditable).toBe(false);
      });

      it('should return unknown for invalid code', () => {
        const result = detectDiagramType('this is not a valid diagram');
        expect(result.type).toBe('unknown');
      });
    });
  });

  describe('isEditableFlowchart', () => {
    it('should return true for flowchart', () => {
      expect(isEditableFlowchart('flowchart TB\n  A --> B')).toBe(true);
    });

    it('should return true for graph', () => {
      expect(isEditableFlowchart('graph LR\n  A --> B')).toBe(true);
    });

    it('should return false for sequenceDiagram', () => {
      expect(isEditableFlowchart('sequenceDiagram\n  A->>B: msg')).toBe(false);
    });

    it('should return false for empty code', () => {
      expect(isEditableFlowchart('')).toBe(false);
    });
  });

  describe('getAllDiagramTypes', () => {
    it('should return all diagram types', () => {
      const types = getAllDiagramTypes();
      expect(types.length).toBeGreaterThan(10);
    });

    it('should include flowchart as editable', () => {
      const types = getAllDiagramTypes();
      const flowchart = types.find((t) => t.type === 'flowchart');
      expect(flowchart).toBeDefined();
      expect(flowchart?.isEditable).toBe(true);
    });

    it('should have non-editable diagrams', () => {
      const types = getAllDiagramTypes();
      const nonEditable = types.filter((t) => !t.isEditable);
      expect(nonEditable.length).toBeGreaterThan(10);
    });
  });
});

