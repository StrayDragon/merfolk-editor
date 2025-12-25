import { describe, it, expect, vi, beforeEach } from 'vitest';
import { HotkeyManager } from './HotkeyManager';

describe('HotkeyManager', () => {
  let manager: HotkeyManager;

  beforeEach(() => {
    manager = new HotkeyManager();
  });

  describe('register/unregister', () => {
    it('should register a binding', () => {
      manager.register({
        id: 'test',
        key: 'ctrl+z',
        action: () => {},
      });

      expect(manager.getBindings()).toHaveLength(1);
      expect(manager.getBindings()[0].id).toBe('test');
    });

    it('should unregister a binding', () => {
      manager.register({
        id: 'test',
        key: 'ctrl+z',
        action: () => {},
      });
      manager.unregister('test');

      expect(manager.getBindings()).toHaveLength(0);
    });

    it('should register multiple bindings', () => {
      manager.registerAll([
        { id: 'undo', key: 'ctrl+z', action: () => {} },
        { id: 'redo', key: 'ctrl+y', action: () => {} },
      ]);

      expect(manager.getBindings()).toHaveLength(2);
    });
  });

  describe('scope management', () => {
    it('should start with global scope', () => {
      expect(manager.currentScope).toBe('global');
    });

    it('should push and pop scopes', () => {
      manager.pushScope('canvas');
      expect(manager.currentScope).toBe('canvas');

      manager.pushScope('dialog');
      expect(manager.currentScope).toBe('dialog');

      manager.popScope();
      expect(manager.currentScope).toBe('canvas');

      manager.popScope();
      expect(manager.currentScope).toBe('global');
    });

    it('should not pop below global scope', () => {
      manager.popScope();
      expect(manager.currentScope).toBe('global');
    });

    it('should filter bindings by scope', () => {
      manager.registerAll([
        { id: 'global-action', key: 'ctrl+g', action: () => {}, scope: 'global' },
        { id: 'canvas-action', key: 'ctrl+c', action: () => {}, scope: 'canvas' },
      ]);

      const canvasBindings = manager.getBindingsForScope('canvas');
      expect(canvasBindings).toHaveLength(2); // global + canvas

      const globalBindings = manager.getBindingsForScope('global');
      expect(globalBindings).toHaveLength(1); // only global
    });
  });

  describe('enable/disable', () => {
    it('should be enabled by default', () => {
      expect(manager.isEnabled).toBe(true);
    });

    it('should toggle enabled state', () => {
      manager.setEnabled(false);
      expect(manager.isEnabled).toBe(false);

      manager.setEnabled(true);
      expect(manager.isEnabled).toBe(true);
    });
  });

  describe('formatKey', () => {
    it('should format simple keys', () => {
      expect(HotkeyManager.formatKey('a')).toBe('A');
    });

    it('should format modifier combinations', () => {
      // This will vary based on platform, just ensure it doesn't throw
      const formatted = HotkeyManager.formatKey('ctrl+shift+a');
      expect(formatted).toBeTruthy();
    });

    it('should format special keys', () => {
      expect(HotkeyManager.formatKey('enter')).toBe('↵');
      expect(HotkeyManager.formatKey('escape')).toBe('Esc');
    });
  });

  describe('keyboard event handling', () => {
    function createKeyEvent(
      key: string,
      {
        ctrl = false,
        alt = false,
        shift = false,
        meta = false,
      }: Partial<{
        ctrl: boolean;
        alt: boolean;
        shift: boolean;
        meta: boolean;
      }> = {}
    ): KeyboardEvent {
      return new KeyboardEvent('keydown', {
        key,
        ctrlKey: ctrl,
        altKey: alt,
        shiftKey: shift,
        metaKey: meta,
        bubbles: true,
        cancelable: true,
      });
    }

    it('should trigger action on matching key', () => {
      const action = vi.fn();
      manager.register({ id: 'test', key: 'a', action });
      manager.attach(document);

      document.dispatchEvent(createKeyEvent('a'));

      expect(action).toHaveBeenCalledTimes(1);

      manager.detach(document);
    });

    it('should trigger action with modifiers', () => {
      const action = vi.fn();
      manager.register({ id: 'test', key: 'ctrl+s', action });
      manager.attach(document);

      // Should not trigger without modifier
      document.dispatchEvent(createKeyEvent('s'));
      expect(action).not.toHaveBeenCalled();

      // Should trigger with modifier
      document.dispatchEvent(createKeyEvent('s', { ctrl: true }));
      expect(action).toHaveBeenCalledTimes(1);

      manager.detach(document);
    });

    it('should not trigger when disabled', () => {
      const action = vi.fn();
      manager.register({ id: 'test', key: 'a', action });
      manager.attach(document);
      manager.setEnabled(false);

      document.dispatchEvent(createKeyEvent('a'));

      expect(action).not.toHaveBeenCalled();

      manager.detach(document);
    });

    it('should respect scope', () => {
      const globalAction = vi.fn();
      const canvasAction = vi.fn();

      manager.register({ id: 'global', key: 'a', action: globalAction, scope: 'global' });
      manager.register({ id: 'canvas', key: 'b', action: canvasAction, scope: 'canvas' });
      manager.attach(document);

      // Global scope - should trigger global, not canvas
      document.dispatchEvent(createKeyEvent('a'));
      expect(globalAction).toHaveBeenCalledTimes(1);

      document.dispatchEvent(createKeyEvent('b'));
      expect(canvasAction).not.toHaveBeenCalled();

      // Canvas scope - should trigger both
      manager.pushScope('canvas');
      document.dispatchEvent(createKeyEvent('a'));
      expect(globalAction).toHaveBeenCalledTimes(2);

      document.dispatchEvent(createKeyEvent('b'));
      expect(canvasAction).toHaveBeenCalledTimes(1);

      manager.detach(document);
    });
  });
});

