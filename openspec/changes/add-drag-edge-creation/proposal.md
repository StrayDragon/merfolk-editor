## Why

当前添加边需要通过对话框选择目标节点，操作步骤多、不直观。用户期望能够从节点边缘直接拖拽到另一个节点创建连线（类似 Draw.io、Excalidraw 的交互方式）。这是 `docs/plan/issues.md` 中明确列出的待解决问题。

## What Changes

- 鼠标悬停节点时显示连接点（端口）
- 从连接点拖拽时显示临时连线
- 拖拽到目标节点时创建边
- 按 Escape 取消拖拽
- 保留现有对话框添加边的方式作为备选

## Impact

- 受影响的规范：canvas-interaction（新增）
- 受影响的代码：
  - `src/canvas/ports/PortManager.ts` - 端口显示逻辑
  - `src/canvas/ports/EdgeCreationState.ts` - 拖拽状态机
  - `src/canvas/edges/EdgeRenderer.ts` - 临时连线渲染
  - `src/components/InteractiveCanvas.svelte` - 事件处理
  - `src/components/NodeOverlay.svelte` - 端口 UI
