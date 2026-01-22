## Why

当前 `MerfolkEditor` 类缺乏统一的事件系统，外部集成（如 VSCode 扩展、React 包装）无法监听内部状态变化。虽然 `src/core/model/EventEmitter.ts` 已有基础实现，但未暴露给库使用者。

## What Changes

- 在 `MerfolkEditor` 类中实现 `on(event, handler)` / `off(event, handler)` / `once(event, handler)` API
- 定义标准事件类型：`codeChange`, `selectionChange`, `nodeAdd`, `nodeRemove`, `edgeAdd`, `edgeRemove`, `ready`, `error`
- 类型安全的事件回调签名
- 内部事件从 `SyncEngine` 和 `FlowchartModel` 冒泡到 `MerfolkEditor`

## Impact

- 受影响的规范：library-api（新增）
- 受影响的代码：
  - `src/lib/index.ts` - 新增事件 API
  - `src/lib/types.ts` - 新增事件类型定义
  - `src/core/sync/SyncEngine.ts` - 事件源
  - `src/core/model/FlowchartModel.ts` - 事件源
