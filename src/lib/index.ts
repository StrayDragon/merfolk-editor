import Editor from '../components/Editor.svelte';
import { SyncEngine } from '../core/sync/SyncEngine';
import type { NodeData } from '../core/model/Node';
import type { EdgeData } from '../core/model/Edge';

type EditorComponentInstance = {
  $destroy?: () => void;
  canvasRef?: {
    zoomIn?: () => void;
    zoomOut?: () => void;
    resetZoom?: () => void;
    fitToView?: () => void;
    toggleEdgeCreation?: () => void;
    setEdgeCreationMode?: (enabled: boolean) => void;
  };
  showCode?: boolean;
  getSyncEngine: () => SyncEngine;
};

/**
 * Merfolk Editor - Mermaid Flowchart Visual Editor Library
 */
export default class MerfolkEditor {
  private editor: EditorComponentInstance;
  private container: HTMLElement;
  private syncEngine: SyncEngine;

  constructor(container: HTMLElement, options: EditorOptions = {}) {
    this.container = container;
    this.syncEngine = new SyncEngine(options.sync);

    // Create Svelte component
    const EditorCtor = Editor as unknown as { new (options: any): EditorComponentInstance };
    this.editor = new EditorCtor({
      target: container,
      props: {
        initialCode: options.initialCode,
        onCodeChange: options.onCodeChange,
      },
    });

    // Setup callbacks
    this.setupCallbacks(options);
  }

  /**
   * 获取当前 Mermaid 代码
   */
  getCode(): string {
    return this.syncEngine.getCode();
  }

  /**
   * 设置 Mermaid 代码
   */
  setCode(code: string): void {
    this.syncEngine.updateFromCode(code);
    // Update editor
    (this.editor as any).code = code;
  }

  /**
   * 添加节点
   */
  addNode(nodeData: NodeData): void {
    this.syncEngine.addNode(nodeData);
  }

  /**
   * 删除节点
   */
  removeNode(nodeId: string): void {
    this.syncEngine.removeNode(nodeId);
  }

  /**
   * 添加边
   */
  addEdge(edgeData: Omit<EdgeData, 'id'> & { id?: string }): void {
    this.syncEngine.addEdge(edgeData);
  }

  /**
   * 删除边
   */
  removeEdge(edgeId: string): void {
    this.syncEngine.removeEdge(edgeId);
  }

  /**
   * 设置节点位置
   */
  setNodePosition(nodeId: string, x: number, y: number): void {
    this.syncEngine.updateNodePosition(nodeId, x, y);
  }

  /**
   * 获取节点位置
   */
  getNodePosition(nodeId: string): { x: number; y: number } | undefined {
    return this.syncEngine.getNodePosition(nodeId);
  }

  /**
   * 获取所有节点位置
   */
  getAllNodePositions(): Record<string, { x: number; y: number }> {
    return this.syncEngine.exportPositions();
  }

  /**
   * 导出位置数据
   */
  exportPositions(): Record<string, { x: number; y: number }> {
    return this.syncEngine.exportPositions();
  }

  /**
   * 导入位置数据
   */
  importPositions(positions: Record<string, { x: number; y: number }>): void {
    this.syncEngine.importPositions(positions);
  }

  /**
   * 缩放控制
   */
  zoomIn(): void {
    const canvas = (this.editor as any).canvasRef;
    canvas?.zoomIn();
  }

  zoomOut(): void {
    const canvas = (this.editor as any).canvasRef;
    canvas?.zoomOut();
  }

  resetZoom(): void {
    const canvas = (this.editor as any).canvasRef;
    canvas?.resetZoom();
  }

  fitToView(): void {
    const canvas = (this.editor as any).canvasRef;
    canvas?.fitToView();
  }

  /**
   * 显示/隐藏代码面板
   */
  showCodePanel(): void {
    (this.editor as any).showCode = true;
  }

  hideCodePanel(): void {
    (this.editor as any).showCode = false;
  }

  /**
   * 切换边创建模式
   */
  toggleEdgeCreationMode(): void {
    const canvas = (this.editor as any).canvasRef;
    canvas?.toggleEdgeCreation();
  }

  /**
   * 设置边创建模式
   */
  setEdgeCreationMode(enabled: boolean): void {
    const canvas = (this.editor as any).canvasRef;
    canvas?.setEdgeCreationMode(enabled);
  }

  /**
   * 获取内部 SyncEngine 实例（高级用法）
   */
  getSyncEngine(): SyncEngine {
    return (this.editor as any).getSyncEngine();
  }

  /**
   * 销毁编辑器实例
   */
  destroy(): void {
    this.syncEngine.destroy();
    this.editor.$destroy?.();
    this.container.innerHTML = '';
  }

  /**
   * 设置回调函数
   */
  private setupCallbacks(_options: EditorOptions): void {
    // Set additional callbacks if needed
    // The callbacks are already passed through props
  }
}

// Types
export interface EditorOptions {
  /** 初始 Mermaid 代码 */
  initialCode?: string;
  /** 代码变更回调 */
  onCodeChange?: (code: string) => void;
  /** 同步引擎选项 */
  sync?: {
    /** 代码变更防抖延迟 (ms) */
    debounceDelay?: number;
  };
}

// Re-export types from core
export type { NodeData, EdgeData } from '../core/model';
export type { NodePosition } from '../core/sync';
export { SyncEngine } from '../core/sync';
export type { SyncEngineOptions } from '../core/sync';

// Export components for advanced usage
export { default as Editor } from '../components/Editor.svelte';
export { default as InteractiveCanvas } from '../components/InteractiveCanvas.svelte';
