## Why

当前 E2E 测试仅有一个被 skip 的 placeholder（`e2e/template.spec.ts`），无法验证用户交互流程的正确性。单元测试覆盖了核心逻辑，但 UI 交互、Svelte 组件渲染、D3 画布行为未被测试。

## What Changes

- 搭建 Playwright E2E 测试框架，配置 helper 函数
- 编写覆盖核心用户流程的测试用例：
  - 节点操作（添加、编辑、删除、拖拽、多选）
  - 边操作（添加、编辑、删除）
  - 代码同步（画布 ↔ 代码双向同步）
  - 撤销/重做
- 集成到 CI 流程

## Impact

- 受影响的规范：testing（新增）
- 受影响的代码：
  - `e2e/template.spec.ts` → 重命名为 `e2e/basic.spec.ts`
  - `e2e/helpers/` (新增目录)
  - `e2e/node-operations.spec.ts` (新增)
  - `e2e/edge-operations.spec.ts` (新增)
  - `e2e/code-sync.spec.ts` (新增)
  - `e2e/undo-redo.spec.ts` (新增)
  - `playwright.config.ts` (更新)
