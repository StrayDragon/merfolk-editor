import { mount, unmount, type Component } from 'svelte';
import Editor from '../components/Editor.svelte';
import { SyncEngine } from '../core/sync/SyncEngine';
import type { SyncEngineOptions } from '../core/sync/SyncEngine';
import type {
  CodeChangeMeta,
  EditorOptions,
  EditorStrings,
  MermaidAPI,
  SetCodeOptions,
} from './types';

type EditorProps = {
  initialCode?: string;
  onCodeChange?: (code: string, meta: CodeChangeMeta) => void;
  onClearDraft?: () => void;
  syncDelay?: number;
  sync?: SyncEngineOptions;
  readOnly?: boolean;
  showCodePanel?: boolean;
  strings?: EditorStrings;
  mermaid?: MermaidAPI;
  mermaidConfig?: import('mermaid').MermaidConfig;
  initializeMermaid?: boolean;
  autoFitOnResize?: boolean;
};

type EditorComponentInstance = {
  getSyncEngine: () => SyncEngine;
  getCode: () => string;
  setCode: (code: string, options?: SetCodeOptions) => void;
  showCodePanel: () => void;
  hideCodePanel: () => void;
  toggleCodePanel: () => void;
  zoomIn: () => void;
  zoomOut: () => void;
  resetZoom: () => void;
  fitToView: () => void;
  refresh: () => void;
  resize: () => void;
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
    // Create Svelte component
    const EditorComponent = Editor as unknown as Component<EditorProps, EditorComponentInstance>;
    this.editor = mount(EditorComponent, {
      target: container,
      props: {
        initialCode: options.initialCode,
        onCodeChange: options.onCodeChange,
        onClearDraft: options.onClearDraft,
        syncDelay: options.syncDelay,
        sync: options.sync,
        readOnly: options.readOnly,
        showCodePanel: options.showCodePanel,
        strings: options.strings,
        mermaid: options.mermaid,
        mermaidConfig: options.mermaidConfig,
        initializeMermaid: options.initializeMermaid,
        autoFitOnResize: options.autoFitOnResize,
      },
    });
    this.syncEngine = this.editor.getSyncEngine();

    // Setup callbacks
    this.setupCallbacks(options);
  }

  /**
   * 获取当前 Mermaid 代码
   */
  getCode(): string {
    return this.editor.getCode();
  }

  /**
   * 设置 Mermaid 代码
   */
  setCode(code: string, options: SetCodeOptions = {}): void {
    this.editor.setCode(code, options);
  }

  /**
   * 删除节点
   */
  removeNode(nodeId: string): void {
    this.syncEngine.removeNode(nodeId);
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
    this.editor.zoomIn();
  }

  zoomOut(): void {
    this.editor.zoomOut();
  }

  resetZoom(): void {
    this.editor.resetZoom();
  }

  fitToView(): void {
    this.editor.fitToView();
  }

  /**
   * 触发重新渲染(尺寸变化或隐藏后显示)
   */
  refresh(): void {
    this.editor.refresh();
  }

  /**
   * 手动同步尺寸并尝试适配视图
   */
  resize(): void {
    this.editor.resize();
  }

  /**
   * 显示/隐藏代码面板
   */
  showCodePanel(): void {
    this.editor.showCodePanel();
  }

  hideCodePanel(): void {
    this.editor.hideCodePanel();
  }

  toggleCodePanel(): void {
    this.editor.toggleCodePanel();
  }

  /**
   * 获取内部 SyncEngine 实例(高级用法)
   */
  getSyncEngine(): SyncEngine {
    return this.syncEngine;
  }

  /**
   * 销毁编辑器实例
   */
  destroy(): void {
    void unmount(this.editor);
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
export type { EditorOptions, EditorStrings, CodeChangeMeta, SetCodeOptions } from './types';
export type { MermaidAPI } from './types';

// Re-export types from core
export type { NodeData, EdgeData } from '../core/model';
export type { NodePosition } from '../core/sync';
export { SyncEngine } from '../core/sync';
export type { SyncEngineOptions } from '../core/sync';

// Export components for advanced usage
export { default as Editor } from '../components/Editor.svelte';
export { default as InteractiveCanvas } from '../components/InteractiveCanvas.svelte';
