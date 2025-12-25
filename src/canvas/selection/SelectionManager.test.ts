import { describe, it, expect, vi } from 'vitest';
import { SelectionManager } from './SelectionManager';

describe('SelectionManager', () => {
  describe('select', () => {
    it('should select an item', () => {
      const sm = new SelectionManager();
      sm.select('A');

      expect(sm.isSelected('A')).toBe(true);
      expect(sm.selectedIds).toEqual(['A']);
    });

    it('should replace selection in single mode', () => {
      const sm = new SelectionManager();
      sm.select('A');
      sm.select('B');

      expect(sm.isSelected('A')).toBe(false);
      expect(sm.isSelected('B')).toBe(true);
      expect(sm.count).toBe(1);
    });

    it('should add to selection in multi mode', () => {
      const sm = new SelectionManager();
      sm.select('A');
      sm.select('B', true);

      expect(sm.isSelected('A')).toBe(true);
      expect(sm.isSelected('B')).toBe(true);
      expect(sm.count).toBe(2);
    });
  });

  describe('deselect', () => {
    it('should remove item from selection', () => {
      const sm = new SelectionManager();
      sm.select('A');
      sm.select('B', true);
      sm.deselect('A');

      expect(sm.isSelected('A')).toBe(false);
      expect(sm.isSelected('B')).toBe(true);
    });
  });

  describe('toggle', () => {
    it('should toggle selection', () => {
      const sm = new SelectionManager();
      sm.toggle('A');
      expect(sm.isSelected('A')).toBe(true);

      sm.toggle('A');
      expect(sm.isSelected('A')).toBe(false);
    });
  });

  describe('clear', () => {
    it('should clear all selections', () => {
      const sm = new SelectionManager();
      sm.select('A');
      sm.select('B', true);
      sm.clear();

      expect(sm.count).toBe(0);
      expect(sm.hasSelection).toBe(false);
    });
  });

  describe('selectMultiple', () => {
    it('should replace selection with multiple items', () => {
      const sm = new SelectionManager();
      sm.select('X');
      sm.selectMultiple(['A', 'B', 'C']);

      expect(sm.isSelected('X')).toBe(false);
      expect(sm.selectedIds).toEqual(['A', 'B', 'C']);
    });
  });

  describe('addToSelection', () => {
    it('should add multiple items to existing selection', () => {
      const sm = new SelectionManager();
      sm.select('A');
      sm.addToSelection(['B', 'C']);

      expect(sm.count).toBe(3);
    });
  });

  describe('events', () => {
    it('should emit change event on selection', () => {
      const sm = new SelectionManager();
      const handler = vi.fn();
      sm.on(handler);

      sm.select('A');

      expect(handler).toHaveBeenCalledWith({
        type: 'selection:change',
        selectedIds: ['A'],
        previousIds: [],
      });
    });

    it('should emit change event with previous state', () => {
      const sm = new SelectionManager();
      sm.select('A');

      const handler = vi.fn();
      sm.on(handler);

      sm.select('B');

      expect(handler).toHaveBeenCalledWith({
        type: 'selection:change',
        selectedIds: ['B'],
        previousIds: ['A'],
      });
    });
  });

  describe('primaryId', () => {
    it('should return first selected ID', () => {
      const sm = new SelectionManager();
      sm.selectMultiple(['A', 'B']);

      expect(sm.primaryId).toBe('A');
    });

    it('should return null when nothing selected', () => {
      const sm = new SelectionManager();
      expect(sm.primaryId).toBeNull();
    });
  });
});

