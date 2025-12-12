import { MermaidParser } from '../parser/MermaidParser';
import { MermaidSerializer } from '../serializer/MermaidSerializer';
import { FlowchartModel } from '../model/FlowchartModel';
import type { NodeData } from '../model/Node';
import type { EdgeData } from '../model/Edge';

/**
 * 节点位置信息
 */
export interface NodePosition {
  id: string;
  x: number;
  y: number;
}

/**
 * 同步引擎配置
 */
export interface SyncEngineOptions {
  /** 代码变更防抖延迟 (ms) */
  debounceDelay?: number;
}

/**
 * 同步引擎
 * 负责协调 Mermaid 代码和画布之间的双向同步
 *
 * 注意：Mermaid 标准语法不支持位置信息，所以：
 * - 位置信息单独存储在 nodePositions 中
 * - 代码同步只处理结构变更（添加/删除节点和边）
 * - 拖拽节点不会改变代码（除非添加/删除操作）
 */
export class SyncEngine {
  private parser: MermaidParser;
  private serializer: MermaidSerializer;
  private model: FlowchartModel;
  private nodePositions: Map<string, { x: number; y: number }>;
  private debounceTimer: ReturnType<typeof setTimeout> | null = null;
  private options: Required<SyncEngineOptions>;

  // 回调
  private onCodeChange?: (code: string) => void;
  private onModelChange?: (model: FlowchartModel) => void;
  private onPositionChange?: (positions: Map<string, { x: number; y: number }>) => void;

  constructor(options: SyncEngineOptions = {}) {
    this.parser = new MermaidParser();
    this.serializer = new MermaidSerializer();
    this.model = new FlowchartModel();
    this.nodePositions = new Map();
    this.options = {
      debounceDelay: options.debounceDelay ?? 300,
    };
  }

  /**
   * 设置代码变更回调
   */
  setOnCodeChange(callback: (code: string) => void): void {
    this.onCodeChange = callback;
  }

  /**
   * 设置模型变更回调
   */
  setOnModelChange(callback: (model: FlowchartModel) => void): void {
    this.onModelChange = callback;
  }

  /**
   * 设置位置变更回调
   */
  setOnPositionChange(callback: (positions: Map<string, { x: number; y: number }>) => void): void {
    this.onPositionChange = callback;
  }

  /**
   * 从代码更新模型（代码 → 模型）
   */
  updateFromCode(code: string): FlowchartModel {
    try {
      this.model = this.parser.parse(code);

      // 恢复保存的位置信息
      for (const node of this.model.nodes) {
        const savedPos = this.nodePositions.get(node.id);
        if (savedPos) {
          node.position = savedPos;
        }
      }

      this.onModelChange?.(this.model);
      return this.model;
    } catch (e) {
      console.error('[SyncEngine] Parse error:', e);
      throw e;
    }
  }

  /**
   * 更新节点位置（仅保存位置，不触发代码更新）
   */
  updateNodePosition(nodeId: string, x: number, y: number): void {
    this.nodePositions.set(nodeId, { x, y });

    const node = this.model.getNode(nodeId);
    if (node) {
      node.position = { x, y };
    }

    this.onPositionChange?.(this.nodePositions);
  }

  /**
   * 批量更新节点位置
   */
  updateNodePositions(positions: NodePosition[]): void {
    for (const pos of positions) {
      this.nodePositions.set(pos.id, { x: pos.x, y: pos.y });
      const node = this.model.getNode(pos.id);
      if (node) {
        node.position = { x: pos.x, y: pos.y };
      }
    }

    this.onPositionChange?.(this.nodePositions);
  }

  /**
   * 添加节点
   */
  addNode(nodeData: NodeData): void {
    this.model.addNode(nodeData);
    this.debouncedSerialize();
  }

  /**
   * 删除节点
   */
  removeNode(nodeId: string): void {
    this.model.removeNode(nodeId);
    this.nodePositions.delete(nodeId);
    this.debouncedSerialize();
  }

  /**
   * 更新节点
   */
  updateNode(nodeId: string, updates: Partial<NodeData>): void {
    const node = this.model.getNode(nodeId);
    if (node) {
      Object.assign(node, updates);
      this.debouncedSerialize();
    }
  }

  /**
   * 添加边
   */
  addEdge(edgeData: EdgeData): void {
    this.model.addEdge(edgeData);
    this.debouncedSerialize();
  }

  /**
   * 删除边
   */
  removeEdge(edgeId: string): void {
    this.model.removeEdge(edgeId);
    this.debouncedSerialize();
  }

  /**
   * 获取当前模型
   */
  getModel(): FlowchartModel {
    return this.model;
  }

  /**
   * 获取当前代码
   */
  getCode(): string {
    return this.serializer.serialize(this.model);
  }

  /**
   * 获取节点位置
   */
  getNodePosition(nodeId: string): { x: number; y: number } | undefined {
    return this.nodePositions.get(nodeId);
  }

  /**
   * 获取所有节点位置
   */
  getAllNodePositions(): Map<string, { x: number; y: number }> {
    return new Map(this.nodePositions);
  }

  /**
   * 清除所有位置信息
   */
  clearPositions(): void {
    this.nodePositions.clear();
  }

  /**
   * 防抖序列化（用于结构变更）
   */
  private debouncedSerialize(): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    this.debounceTimer = setTimeout(() => {
      const code = this.serializer.serialize(this.model);
      this.onCodeChange?.(code);
      this.debounceTimer = null;
    }, this.options.debounceDelay);
  }

  /**
   * 立即序列化（不防抖）
   */
  serializeNow(): string {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
    const code = this.serializer.serialize(this.model);
    this.onCodeChange?.(code);
    return code;
  }

  /**
   * 导出位置数据（用于持久化）
   */
  exportPositions(): Record<string, { x: number; y: number }> {
    const result: Record<string, { x: number; y: number }> = {};
    for (const [id, pos] of this.nodePositions) {
      result[id] = pos;
    }
    return result;
  }

  /**
   * 导入位置数据
   */
  importPositions(positions: Record<string, { x: number; y: number }>): void {
    this.nodePositions.clear();
    for (const [id, pos] of Object.entries(positions)) {
      this.nodePositions.set(id, pos);
    }
  }

  /**
   * 销毁
   */
  destroy(): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
  }
}
