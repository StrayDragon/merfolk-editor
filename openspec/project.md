# Project 上下文

## 目的

Merfolk Editor 是一个支持 Mermaid 代码与可视化画布双向同步的流程图编辑器。主要目标：

1. 提供 Flowchart 图的完整 Mermaid 语法支持（v11.12.2）
2. 实现直观的可视化编辑体验（拖拽、连线、右键菜单）
3. 作为可嵌入库供 VSCode 扩展、Obsidian 插件、Web 应用使用

## 技术栈

- **UI 框架**: Svelte 5（使用 runes: `$state`, `$props`, `$effect`）
- **语言**: TypeScript 5.9+（严格模式）
- **渲染**: D3.js 7.x（SVG 画布）
- **布局**: @dagrejs/dagre 1.x（自动布局算法）
- **图表**: Mermaid 11.x（解析和预览）
- **测试**: Vitest（单元测试）、Playwright（E2E 测试）
- **构建**: Vite 7.x（ESM/CJS/IIFE 多格式输出）
- **包管理**: pnpm 10.x

## 项目约定

### 代码风格

- 2 空格缩进
- 路径别名：`$core/*`, `$canvas/*`, `$components/*`, `$lib/*`
- 组件文件：`PascalCase.svelte`
- 测试文件：`*.test.ts`（单元）、`*.spec.ts`（E2E）
- 导出风格：具名导出优先，仅 `MerfolkEditor` 类使用默认导出

### 架构模式

```
src/
├── core/           # 核心模型层（无 UI 依赖）
│   ├── model/      # FlowchartModel, Node, Edge, SubGraph
│   ├── parser/     # MermaidParser（代码 → 模型）
│   ├── serializer/ # MermaidSerializer（模型 → 代码）
│   ├── command/    # Command 模式（撤销/重做）
│   └── sync/       # SyncEngine（双向同步）
├── canvas/         # 画布渲染层
│   ├── shapes/     # 节点形状渲染
│   ├── edges/      # 边渲染
│   ├── layout/     # Dagre 布局
│   ├── selection/  # 选择管理
│   └── drag/       # 拖拽状态
├── components/     # Svelte UI 组件
│   ├── Editor.svelte       # 主编辑器
│   ├── InteractiveCanvas.svelte  # 交互画布
│   ├── CodePanel.svelte    # 代码面板
│   └── *Dialog.svelte      # 各种对话框
└── lib/            # 库入口
    ├── index.ts    # MerfolkEditor 类
    └── types.ts    # 公开类型定义
```

### 测试策略

- **单元测试**: 覆盖 `src/core/` 和 `src/canvas/` 的所有模块
- **E2E 测试**: 覆盖核心用户流程（节点/边操作、代码同步、撤销重做）
- **测试命令**: `pnpm test`（单元）、`pnpm test:e2e`（E2E）
- **覆盖率目标**: 单元 85%+，E2E 核心流程 100%

### Git 工作流程

- **主分支**: `main`
- **提交规范**: Conventional Commits
  - `feat(scope): ...` - 新功能
  - `fix(scope): ...` - Bug 修复
  - `docs: ...` - 文档更新
  - `refactor(scope): ...` - 重构
  - `test(scope): ...` - 测试
- **发布**: 通过 git tag 触发 GitHub Actions

## 领域上下文

- **Mermaid 语法**: 参考 https://mermaid.js.org/syntax/flowchart.html
- **节点形状**: 30+ 种，包括传统语法（`[text]`, `(text)`, `{text}`）和新 `@{}` 语法
- **边类型**: 箭头、圆形、叉形、双向、虚线、粗线、隐形
- **子图**: 支持嵌套、方向控制、子图间连线

## 重要约束

- **浏览器兼容**: 现代浏览器（Chrome 90+, Firefox 90+, Safari 14+）
- **依赖**: mermaid, d3, @dagrejs/dagre, svelte 为 peerDependencies
- **包体积**: standalone bundle < 1MB（含依赖）
- **无后端**: 纯前端库，不依赖服务器

## 外部依赖项

| 依赖 | 用途 | 版本约束 |
|------|------|----------|
| mermaid | 解析/渲染 Mermaid 代码 | >=10.0.0 |
| d3 | SVG 操作和交互 | >=7.0.0 |
| @dagrejs/dagre | 图布局算法 | >=1.0.0 |
| svelte | UI 组件框架 | >=5.0.0 |
