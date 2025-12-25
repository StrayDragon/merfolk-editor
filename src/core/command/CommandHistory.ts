import type { Command } from './Command';

/**
 * Manages command history for undo/redo functionality
 */
export class CommandHistory {
  private undoStack: Command[] = [];
  private redoStack: Command[] = [];
  private readonly maxSize: number;

  constructor(maxSize: number = 50) {
    this.maxSize = maxSize;
  }

  /**
   * Execute a command and add it to history
   */
  execute(command: Command): void {
    command.execute();
    this.undoStack.push(command);

    // Clear redo stack on new action
    this.redoStack = [];

    // Enforce max size
    if (this.undoStack.length > this.maxSize) {
      this.undoStack.shift();
    }
  }

  /**
   * Undo the last command
   * @returns true if undo was performed
   */
  undo(): boolean {
    const command = this.undoStack.pop();
    if (command) {
      command.undo();
      this.redoStack.push(command);
      return true;
    }
    return false;
  }

  /**
   * Redo the last undone command
   * @returns true if redo was performed
   */
  redo(): boolean {
    const command = this.redoStack.pop();
    if (command) {
      command.execute();
      this.undoStack.push(command);
      return true;
    }
    return false;
  }

  /**
   * Check if undo is available
   */
  get canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  /**
   * Check if redo is available
   */
  get canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  /**
   * Get the number of commands in undo stack
   */
  get undoCount(): number {
    return this.undoStack.length;
  }

  /**
   * Get the number of commands in redo stack
   */
  get redoCount(): number {
    return this.redoStack.length;
  }

  /**
   * Clear all history
   */
  clear(): void {
    this.undoStack = [];
    this.redoStack = [];
  }

  /**
   * Get descriptions of undo stack (for debugging/UI)
   */
  getUndoDescriptions(): string[] {
    return this.undoStack
      .map((cmd) => cmd.description)
      .filter((d): d is string => d !== undefined);
  }

  /**
   * Get descriptions of redo stack (for debugging/UI)
   */
  getRedoDescriptions(): string[] {
    return this.redoStack
      .map((cmd) => cmd.description)
      .filter((d): d is string => d !== undefined);
  }
}

