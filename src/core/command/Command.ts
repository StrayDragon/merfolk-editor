/**
 * Command interface for undo/redo system
 * Implements the Command pattern
 */
export interface Command {
  /**
   * Execute the command
   */
  execute(): void;

  /**
   * Undo the command
   */
  undo(): void;

  /**
   * Optional description for debugging/UI
   */
  readonly description?: string;
}

/**
 * Composite command that groups multiple commands
 * All commands are executed/undone together
 */
export class CompositeCommand implements Command {
  constructor(
    private readonly commands: Command[],
    public readonly description?: string
  ) {}

  execute(): void {
    for (const cmd of this.commands) {
      cmd.execute();
    }
  }

  undo(): void {
    // Undo in reverse order
    for (let i = this.commands.length - 1; i >= 0; i--) {
      this.commands[i].undo();
    }
  }
}

