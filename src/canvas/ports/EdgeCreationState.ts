import type { Port } from './PortManager';

export interface EdgeCreationPreview {
  sourceX: number;
  sourceY: number;
  targetX: number;
  targetY: number;
}

/**
 * Manages the state of edge creation (dragging from port to port)
 */
export class EdgeCreationState {
  private _sourcePort: Port | null = null;
  private _previewLine: EdgeCreationPreview | null = null;
  private _isActive: boolean = false;

  /**
   * Start edge creation from a port
   */
  startFromPort(port: Port): void {
    this._sourcePort = port;
    this._isActive = true;
    this._previewLine = {
      sourceX: port.x,
      sourceY: port.y,
      targetX: port.x,
      targetY: port.y,
    };
  }

  /**
   * Update preview line endpoint
   */
  updatePreview(mouseX: number, mouseY: number): void {
    if (!this._sourcePort || !this._previewLine) return;
    this._previewLine = {
      ...this._previewLine,
      targetX: mouseX,
      targetY: mouseY,
    };
  }

  /**
   * Snap preview to a port
   */
  snapToPort(port: Port): void {
    if (!this._previewLine) return;
    this._previewLine = {
      ...this._previewLine,
      targetX: port.x,
      targetY: port.y,
    };
  }

  /**
   * Complete edge creation to a target port
   * @returns Edge data if successful, null if cancelled
   */
  completeToPort(
    targetPort: Port
  ): { sourceNodeId: string; targetNodeId: string } | null {
    if (!this._sourcePort) {
      this.cancel();
      return null;
    }

    // Prevent self-connection
    if (this._sourcePort.nodeId === targetPort.nodeId) {
      this.cancel();
      return null;
    }

    const result = {
      sourceNodeId: this._sourcePort.nodeId,
      targetNodeId: targetPort.nodeId,
    };

    this.cancel();
    return result;
  }

  /**
   * Cancel edge creation
   */
  cancel(): void {
    this._sourcePort = null;
    this._previewLine = null;
    this._isActive = false;
  }

  /**
   * Check if edge creation is active
   */
  get isActive(): boolean {
    return this._isActive;
  }

  /**
   * Get the source port
   */
  get sourcePort(): Port | null {
    return this._sourcePort;
  }

  /**
   * Get the preview line
   */
  get previewLine(): EdgeCreationPreview | null {
    return this._previewLine;
  }
}

