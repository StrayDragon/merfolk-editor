import type { EventListener } from './types';

/**
 * Simple event emitter for model change notifications
 */
export class EventEmitter<T> {
  private listeners: Set<EventListener<T>> = new Set();

  /**
   * Subscribe to events
   */
  on(listener: EventListener<T>): () => void {
    this.listeners.add(listener);
    return () => this.off(listener);
  }

  /**
   * Unsubscribe from events
   */
  off(listener: EventListener<T>): void {
    this.listeners.delete(listener);
  }

  /**
   * Emit an event to all listeners
   */
  protected emit(event: T): void {
    for (const listener of this.listeners) {
      listener(event);
    }
  }

  /**
   * Remove all listeners
   */
  removeAllListeners(): void {
    this.listeners.clear();
  }
}
