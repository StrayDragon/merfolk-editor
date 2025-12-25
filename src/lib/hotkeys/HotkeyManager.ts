/**
 * Hotkey binding definition
 */
export interface HotkeyBinding {
  /** Unique ID for this binding */
  id: string;
  /** Key combination (e.g., 'ctrl+z', 'cmd+shift+s') */
  key: string;
  /** Action to execute */
  action: () => void;
  /** Description for UI display */
  description?: string;
  /** Scope where this hotkey is active (default: 'global') */
  scope?: string;
  /** Whether to prevent default browser behavior */
  preventDefault?: boolean;
}

/**
 * Parsed key combination
 */
interface ParsedKey {
  key: string;
  ctrl: boolean;
  alt: boolean;
  shift: boolean;
  meta: boolean;
}

/**
 * Centralized hotkey management system
 */
export class HotkeyManager {
  private bindings: Map<string, HotkeyBinding> = new Map();
  private scopeStack: string[] = ['global'];
  private enabled: boolean = true;
  private handleKeyDown: (e: KeyboardEvent) => void;

  constructor() {
    this.handleKeyDown = this.onKeyDown.bind(this);
  }

  /**
   * Start listening for keyboard events
   */
  attach(target: EventTarget = document): void {
    target.addEventListener('keydown', this.handleKeyDown as EventListener);
  }

  /**
   * Stop listening for keyboard events
   */
  detach(target: EventTarget = document): void {
    target.removeEventListener('keydown', this.handleKeyDown as EventListener);
  }

  /**
   * Register a hotkey binding
   */
  register(binding: HotkeyBinding): void {
    this.bindings.set(binding.id, {
      ...binding,
      scope: binding.scope ?? 'global',
      preventDefault: binding.preventDefault ?? true,
    });
  }

  /**
   * Register multiple bindings at once
   */
  registerAll(bindings: HotkeyBinding[]): void {
    for (const binding of bindings) {
      this.register(binding);
    }
  }

  /**
   * Unregister a hotkey binding
   */
  unregister(id: string): void {
    this.bindings.delete(id);
  }

  /**
   * Push a new scope onto the stack
   */
  pushScope(scope: string): void {
    this.scopeStack.push(scope);
  }

  /**
   * Pop the current scope from the stack
   */
  popScope(): string | undefined {
    if (this.scopeStack.length > 1) {
      return this.scopeStack.pop();
    }
    return undefined;
  }

  /**
   * Get the current active scope
   */
  get currentScope(): string {
    return this.scopeStack[this.scopeStack.length - 1];
  }

  /**
   * Enable/disable hotkey handling
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  /**
   * Check if hotkeys are enabled
   */
  get isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Get all registered bindings (for UI display)
   */
  getBindings(): HotkeyBinding[] {
    return Array.from(this.bindings.values());
  }

  /**
   * Get bindings for a specific scope
   */
  getBindingsForScope(scope: string): HotkeyBinding[] {
    return this.getBindings().filter(
      (b) => b.scope === scope || b.scope === 'global'
    );
  }

  /**
   * Format key combination for display
   */
  static formatKey(key: string): string {
    const isMac = typeof navigator !== 'undefined' && /Mac/i.test(navigator.platform);

    return key
      .split('+')
      .map((part) => {
        const p = part.trim().toLowerCase();
        switch (p) {
          case 'ctrl':
          case 'control':
            return isMac ? '⌃' : 'Ctrl';
          case 'alt':
            return isMac ? '⌥' : 'Alt';
          case 'shift':
            return isMac ? '⇧' : 'Shift';
          case 'meta':
          case 'cmd':
          case 'command':
            return isMac ? '⌘' : 'Win';
          case 'enter':
            return '↵';
          case 'escape':
          case 'esc':
            return 'Esc';
          case 'delete':
          case 'del':
            return 'Del';
          case 'backspace':
            return '⌫';
          case 'arrowup':
            return '↑';
          case 'arrowdown':
            return '↓';
          case 'arrowleft':
            return '←';
          case 'arrowright':
            return '→';
          default:
            return p.length === 1 ? p.toUpperCase() : p;
        }
      })
      .join(isMac ? '' : '+');
  }

  /**
   * Handle keydown event
   */
  private onKeyDown(e: KeyboardEvent): void {
    if (!this.enabled) return;

    // Don't trigger hotkeys when typing in input fields
    const target = e.target as HTMLElement;
    if (
      target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      target.isContentEditable
    ) {
      // Allow Escape to work even in input fields
      if (e.key !== 'Escape') return;
    }

    const eventKey = this.parseKeyEvent(e);

    for (const binding of this.bindings.values()) {
      // Check scope
      if (
        binding.scope !== 'global' &&
        binding.scope !== this.currentScope
      ) {
        continue;
      }

      const bindingKey = this.parseKeyString(binding.key);

      if (this.matchesKey(eventKey, bindingKey)) {
        if (binding.preventDefault) {
          e.preventDefault();
          e.stopPropagation();
        }
        binding.action();
        return;
      }
    }
  }

  /**
   * Parse keyboard event into ParsedKey
   */
  private parseKeyEvent(e: KeyboardEvent): ParsedKey {
    return {
      key: e.key.toLowerCase(),
      ctrl: e.ctrlKey,
      alt: e.altKey,
      shift: e.shiftKey,
      meta: e.metaKey,
    };
  }

  /**
   * Parse key string into ParsedKey
   */
  private parseKeyString(keyStr: string): ParsedKey {
    const parts = keyStr.toLowerCase().split('+').map((s) => s.trim());
    const result: ParsedKey = {
      key: '',
      ctrl: false,
      alt: false,
      shift: false,
      meta: false,
    };

    for (const part of parts) {
      switch (part) {
        case 'ctrl':
        case 'control':
          result.ctrl = true;
          break;
        case 'alt':
          result.alt = true;
          break;
        case 'shift':
          result.shift = true;
          break;
        case 'meta':
        case 'cmd':
        case 'command':
          result.meta = true;
          break;
        case 'mod':
          // 'mod' = Cmd on Mac, Ctrl on others
          if (typeof navigator !== 'undefined' && /Mac/i.test(navigator.platform)) {
            result.meta = true;
          } else {
            result.ctrl = true;
          }
          break;
        default:
          // Map key aliases
          result.key = this.normalizeKeyName(part);
          break;
      }
    }

    return result;
  }

  /**
   * Normalize key names to match event.key
   */
  private normalizeKeyName(key: string): string {
    const aliases: Record<string, string> = {
      esc: 'escape',
      del: 'delete',
      ins: 'insert',
      up: 'arrowup',
      down: 'arrowdown',
      left: 'arrowleft',
      right: 'arrowright',
      space: ' ',
      plus: '+',
      minus: '-',
    };
    return aliases[key] || key;
  }

  /**
   * Check if event key matches binding key
   */
  private matchesKey(event: ParsedKey, binding: ParsedKey): boolean {
    return (
      event.key === binding.key &&
      event.ctrl === binding.ctrl &&
      event.alt === binding.alt &&
      event.shift === binding.shift &&
      event.meta === binding.meta
    );
  }
}

