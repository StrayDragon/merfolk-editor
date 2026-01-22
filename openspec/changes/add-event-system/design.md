## Context

Merfolk Editor 作为可嵌入库，需要让外部消费者监听内部状态变化。当前架构中：
- `FlowchartModel` 已有 `EventEmitter` 基类
- `SyncEngine` 管理模型与视图同步
- `MerfolkEditor` 是库入口，但未暴露事件机制

外部集成场景：
- VSCode 扩展需要监听 `codeChange` 同步文件
- React 包装需要监听状态变化触发 re-render
- Obsidian 插件需要监听 `ready` 初始化完成

## Goals / Non-Goals

**Goals:**
- 提供类型安全的事件 API
- 事件从内部模型冒泡到 `MerfolkEditor`
- 支持 `once()` 一次性监听
- 无内存泄漏

**Non-Goals:**
- 不实现事件取消/阻止冒泡
- 不实现异步事件队列
- 不实现事件命名空间

## Decisions

### Decision 1: 复用 EventEmitter 基类

**内容**: 在 `MerfolkEditor` 中组合（composition）而非继承 `EventEmitter`

**原因**: 
- 组合优于继承，保持类职责单一
- 避免暴露 `emit()` 等内部方法

**Alternatives considered**:
- 继承 EventEmitter：会暴露 `emit()` 给外部，不安全
- 第三方库（mitt, eventemitter3）：增加依赖，当前需求简单

### Decision 2: 事件类型定义

**内容**: 使用 TypeScript 联合类型 + 映射类型实现类型安全

```typescript
type EditorEventMap = {
  codeChange: { code: string; source: CodeChangeSource };
  selectionChange: { nodeIds: string[] };
  nodeAdd: { node: NodeData };
  // ...
};

on<K extends keyof EditorEventMap>(event: K, handler: (payload: EditorEventMap[K]) => void): void;
```

**原因**: 编译时类型检查，IDE 自动补全

### Decision 3: 事件冒泡机制

**内容**: `MerfolkEditor` 订阅 `SyncEngine` 和 `FlowchartModel` 事件，转发为统一的编辑器事件

```
FlowchartModel ---> SyncEngine ---> MerfolkEditor ---> External Consumer
(nodeAdded)        (modelChange)    (nodeAdd)
```

**原因**: 解耦内部实现，外部只关心 `MerfolkEditor` 级别的事件

## Risks / Trade-offs

| 风险 | 影响 | 缓解措施 |
|------|------|----------|
| 事件命名不一致 | 混淆用户 | 统一使用 camelCase，与 DOM 事件风格一致 |
| 高频事件性能问题 | 卡顿 | 对 `codeChange` 等高频事件进行节流 |
| 内存泄漏 | 长时间运行内存增长 | 单元测试覆盖，文档提醒用户 `off()` |

## Migration Plan

1. 新增 API，不修改现有 API
2. `onCodeChange` 回调保持兼容，内部转为事件监听
3. 无破坏性变更，无需迁移

## Open Questions

- [ ] 是否需要 `emit()` 公开给高级用户？（暂定不公开）
- [ ] 是否需要事件优先级？（暂定不需要）
