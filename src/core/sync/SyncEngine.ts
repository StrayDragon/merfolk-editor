import { MermaidParser } from '../parser/MermaidParser';
import { MermaidSerializer } from '../serializer/MermaidSerializer';
import { FlowchartModel, type FlowchartData } from '../model/FlowchartModel';
import type { FlowEdge } from '../model/Edge';
import type { ShapeType, StrokeType, ArrowType } from '../model/types';

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
  /** 历史记录最大长度 */
  maxHistoryLength?: number;
}

/**
 * 历史记录项
 */
interface HistoryEntry {
  data: FlowchartData;
  positions: Record<string, { x: number; y: number }>;
}

/**
 * 同步引擎
 * 负责协调 Mermaid 代码和画布之间的双向同步
 *
 * 注意:Mermaid 标准语法不支持位置信息,所以:
 * - 位置信息单独存储在 nodePositions 中
 * - 代码同步只处理结构变更(添加/删除节点和边)
 * - 拖拽节点不会改变代码(除非添加/删除操作)
 */
export class SyncEngine {
  private parser: MermaidParser;
  private serializer: MermaidSerializer;
  private model: FlowchartModel;
  private nodePositions: Map<string, { x: number; y: number }>;
  private debounceTimer: ReturnType<typeof setTimeout> | null = null;
  private options: Required<Pick<SyncEngineOptions, 'debounceDelay'>> & { maxHistoryLength: number };

  // 回调
  private onCodeChange?: (code: string) => void;

  // 撤销/重做历史
  private undoStack: HistoryEntry[] = [];
  private redoStack: HistoryEntry[] = [];

  constructor(options: SyncEngineOptions = {}) {
    this.parser = new MermaidParser();
    this.serializer = new MermaidSerializer();
    this.model = new FlowchartModel();
    this.nodePositions = new Map();
    this.options = {
      debounceDelay: options.debounceDelay ?? 300,
      maxHistoryLength: options.maxHistoryLength ?? 50,
    };
  }

  /**
   * 设置代码变更回调
   */
  setOnCodeChange(callback: (code: string) => void): void {
    this.onCodeChange = callback;
  }

  /**
   * 从代码更新模型(代码 → 模型)
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

      return this.model;
    } catch (e) {
      console.error('[SyncEngine] Parse error:', e);
      throw e;
    }
  }

  /**
   * 更新节点位置(仅保存位置,不触发代码更新)
   */
  updateNodePosition(nodeId: string, x: number, y: number): void {
    this.nodePositions.set(nodeId, { x, y });
    this.model.updateNode(nodeId, { position: { x, y } });
  }

  /**
   * 删除节点
   */
  removeNode(nodeId: string): void {
    this.saveToHistory();
    this.model.removeNode(nodeId);
    this.nodePositions.delete(nodeId);
    this.debouncedSerialize();
  }

  /**
   * 添加节点
   */
  addNode(
    nodeId: string,
    text: string,
    position?: { x: number; y: number },
    shape: ShapeType = 'rect'
  ): void {
    this.saveToHistory();
    this.model.addNode({
      id: nodeId,
      text,
      shape,
      position
    });
    if (position) {
      this.nodePositions.set(nodeId, position);
    }
    this.debouncedSerialize();
  }

  /**
   * 更新节点文本
   */
  updateNodeText(nodeId: string, text: string): void {
    if (!this.model.getNode(nodeId)) {
      return;
    }
    this.saveToHistory();
    this.model.updateNode(nodeId, { text });
    this.debouncedSerialize();
  }

  /**
   * 更新节点形状
   */
  updateNodeShape(nodeId: string, shape: ShapeType): void {
    if (!this.model.getNode(nodeId)) {
      return;
    }
    this.saveToHistory();
    this.model.updateNode(nodeId, { shape });
    this.debouncedSerialize();
  }

  /**
   * 更新节点(文本和形状)
   */
  updateNode(nodeId: string, text: string, shape: ShapeType): void {
    if (!this.model.getNode(nodeId)) {
      return;
    }
    this.saveToHistory();
    this.model.updateNode(nodeId, { text, shape });
    this.debouncedSerialize();
  }

  /**
   * 添加边
   */
  addEdge(
    sourceId: string,
    targetId: string,
    text?: string,
    stroke: StrokeType = 'normal',
    arrowEnd: ArrowType = 'arrow'
  ): void {
    this.saveToHistory();
    this.model.addEdge({
      source: sourceId,
      target: targetId,
      text,
      stroke,
      arrowStart: 'none',
      arrowEnd,
    });
    this.debouncedSerialize();
  }

  /**
   * 删除边
   */
  removeEdge(edgeId: string): void {
    this.saveToHistory();
    this.model.removeEdge(edgeId);
    this.debouncedSerialize();
  }

  /**
   * 在边上插入节点
   * 将 A --> B 变为 A --> NewNode --> B
   */
  insertNodeOnEdge(sourceId: string, targetId: string, shape: ShapeType = 'rect'): void {
    this.saveToHistory();

    // 找到原边
    const originalEdge = this.model.edges.find(
      e => e.source === sourceId && e.target === targetId
    );
    if (!originalEdge) {
      console.warn('[SyncEngine] Edge not found:', sourceId, '->', targetId);
      return;
    }

    // 生成新节点 ID
    const newNodeId = this.generateUniqueNodeId();

    // 创建新节点
    this.model.addNode({
      id: newNodeId,
      text: '新节点',
      shape,
    });

    const baseEdgeData = {
      stroke: originalEdge.stroke,
      arrowStart: originalEdge.arrowStart,
      arrowEnd: originalEdge.arrowEnd,
      style: originalEdge.style ? { ...originalEdge.style } : undefined,
      cssClasses: originalEdge.cssClasses.length > 0 ? [...originalEdge.cssClasses] : undefined,
      animate: originalEdge.animate,
      animation: originalEdge.animation,
      length: originalEdge.length,
    };

    // 创建两条新边:source -> newNode, newNode -> target
    // 保留原边的样式和属性
    this.model.addEdge({
      source: sourceId,
      target: newNodeId,
      text: originalEdge.text,
      ...baseEdgeData,
    });
    this.model.addEdge({
      source: newNodeId,
      target: targetId,
      ...baseEdgeData,
    });

    // 删除原边
    this.model.removeEdge(originalEdge.id);

    this.debouncedSerialize();
  }

  /**
   * 生成唯一的节点 ID
   */
  private generateUniqueNodeId(): string {
    const existingIds = new Set(this.model.nodes.map(n => n.id));
    let counter = 1;
    let newId = `N${counter}`;
    while (existingIds.has(newId)) {
      counter++;
      newId = `N${counter}`;
    }
    return newId;
  }

  /**
   * 更新边文本
   */
  updateEdgeText(edgeId: string, text: string): void {
    this.updateEdge(edgeId, { text });
  }

  /**
   * 更新边属性
   */
  updateEdge(
    edgeId: string,
    updates: {
      text?: string;
      stroke?: StrokeType;
      arrowStart?: ArrowType;
      arrowEnd?: ArrowType;
    }
  ): void {
    if (!this.model.getEdge(edgeId)) {
      return;
    }

    this.saveToHistory();

    const edgeUpdates: {
      text?: string;
      stroke?: StrokeType;
      arrowStart?: ArrowType;
      arrowEnd?: ArrowType;
    } = {};

    if ('text' in updates) {
      if (typeof updates.text === 'string') {
        edgeUpdates.text = updates.text === '' ? undefined : updates.text;
      } else {
        edgeUpdates.text = undefined;
      }
    }
    if (updates.stroke !== undefined) {
      edgeUpdates.stroke = updates.stroke;
    }
    if (updates.arrowStart !== undefined) {
      edgeUpdates.arrowStart = updates.arrowStart;
    }
    if (updates.arrowEnd !== undefined) {
      edgeUpdates.arrowEnd = updates.arrowEnd;
    }

    this.model.updateEdge(edgeId, edgeUpdates);
    this.debouncedSerialize();
  }

  /**
   * 获取所有节点信息(用于边添加对话框)
   */
  getNodesForEdgeDialog(): { id: string; text: string }[] {
    return this.model.nodes.map(n => ({ id: n.id, text: n.text }));
  }

  /**
   * 通过 ID 获取边
   */
  getEdgeById(edgeId: string): FlowEdge | undefined {
    return this.model.getEdge(edgeId);
  }

  /**
   * 通过源节点和目标节点获取边
   */
  getEdge(sourceId: string, targetId: string): FlowEdge | undefined {
    return this.model.edges.find(e => e.source === sourceId && e.target === targetId);
  }

  /**
   * 获取节点形状
   */
  getNodeShape(nodeId: string): ShapeType | undefined {
    return this.model.getNode(nodeId)?.shape;
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
   * 防抖序列化(用于结构变更)
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
   * 导出位置数据(用于持久化)
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

  // ============ 撤销/重做 ============

  /**
   * 保存当前状态到历史记录
   */
  private saveToHistory(): void {
    const entry: HistoryEntry = {
      data: this.model.toData(),
      positions: this.exportPositions(),
    };

    this.undoStack.push(entry);

    // 限制历史记录长度
    if (this.undoStack.length > this.options.maxHistoryLength) {
      this.undoStack.shift();
    }

    // 清空重做栈
    this.redoStack = [];
  }

  /**
   * 从历史记录恢复状态
   */
  private restoreFromHistory(entry: HistoryEntry): void {
    this.model = FlowchartModel.fromData(entry.data);
    this.importPositions(entry.positions);

    // 立即同步代码
    const code = this.serializer.serialize(this.model);
    this.onCodeChange?.(code);
  }

  /**
   * 撤销
   */
  undo(): boolean {
    if (this.undoStack.length === 0) {
      return false;
    }

    // 保存当前状态到重做栈
    const currentEntry: HistoryEntry = {
      data: this.model.toData(),
      positions: this.exportPositions(),
    };
    this.redoStack.push(currentEntry);

    // 恢复上一个状态
    const prevEntry = this.undoStack.pop()!;
    this.restoreFromHistory(prevEntry);

    return true;
  }

  /**
   * 重做
   */
  redo(): boolean {
    if (this.redoStack.length === 0) {
      return false;
    }

    // 保存当前状态到撤销栈
    const currentEntry: HistoryEntry = {
      data: this.model.toData(),
      positions: this.exportPositions(),
    };
    this.undoStack.push(currentEntry);

    // 恢复下一个状态
    const nextEntry = this.redoStack.pop()!;
    this.restoreFromHistory(nextEntry);

    return true;
  }

  /**
   * 是否可以撤销
   */
  canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  /**
   * 是否可以重做
   */
  canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  /**
   * 清除历史记录
   */
  clearHistory(): void {
    this.undoStack = [];
    this.redoStack = [];
  }

  /**
   * 销毁
   */
  destroy(): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
    this.clearHistory();
  }
}
