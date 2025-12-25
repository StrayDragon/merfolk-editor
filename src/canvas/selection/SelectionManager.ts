import { EventEmitter } from '../../core/model/EventEmitter';

export interface SelectionChangeEvent {
  type: 'selection:change';
  selectedIds: string[];
  previousIds: string[];
}

/**
 * Manages selection state for nodes and edges
 */
export class SelectionManager extends EventEmitter<SelectionChangeEvent> {
  private selected: Set<string> = new Set();

  /**
   * Select an item
   * @param id Item ID
   * @param multi If true, add to selection; if false, replace selection
   */
  select(id: string, multi: boolean = false): void {
    const previousIds = this.selectedIds;

    if (!multi) {
      this.selected.clear();
    }
    this.selected.add(id);

    this.emitChange(previousIds);
  }

  /**
   * Deselect an item
   */
  deselect(id: string): void {
    if (!this.selected.has(id)) return;

    const previousIds = this.selectedIds;
    this.selected.delete(id);
    this.emitChange(previousIds);
  }

  /**
   * Toggle selection of an item
   */
  toggle(id: string): void {
    const previousIds = this.selectedIds;

    if (this.selected.has(id)) {
      this.selected.delete(id);
    } else {
      this.selected.add(id);
    }

    this.emitChange(previousIds);
  }

  /**
   * Clear all selections
   */
  clear(): void {
    if (this.selected.size === 0) return;

    const previousIds = this.selectedIds;
    this.selected.clear();
    this.emitChange(previousIds);
  }

  /**
   * Select multiple items at once
   */
  selectMultiple(ids: string[]): void {
    const previousIds = this.selectedIds;
    this.selected.clear();

    for (const id of ids) {
      this.selected.add(id);
    }

    this.emitChange(previousIds);
  }

  /**
   * Add multiple items to selection
   */
  addToSelection(ids: string[]): void {
    const previousIds = this.selectedIds;

    for (const id of ids) {
      this.selected.add(id);
    }

    this.emitChange(previousIds);
  }

  /**
   * Check if an item is selected
   */
  isSelected(id: string): boolean {
    return this.selected.has(id);
  }

  /**
   * Get all selected IDs
   */
  get selectedIds(): string[] {
    return Array.from(this.selected);
  }

  /**
   * Get the number of selected items
   */
  get count(): number {
    return this.selected.size;
  }

  /**
   * Check if any items are selected
   */
  get hasSelection(): boolean {
    return this.selected.size > 0;
  }

  /**
   * Get the first selected ID (primary selection)
   */
  get primaryId(): string | null {
    return this.selected.size > 0 ? this.selectedIds[0] : null;
  }

  private emitChange(previousIds: string[]): void {
    this.emit({
      type: 'selection:change',
      selectedIds: this.selectedIds,
      previousIds,
    });
  }
}

