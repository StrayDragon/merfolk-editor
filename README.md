# Merfolk Editor

一款支持 Mermaid 代码与可视化画布双向同步的流程图编辑器。

<!-- [![NPM Version](https://img.shields.io/npm/v/merfolk-editor)](https://www.npmjs.com/package/merfolk-editor) -->
<!-- [![License](https://img.shields.io/npm/l/merfolk-editor)](LICENSE) -->
<!-- [![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue)](https://www.typescriptlang.org/) -->
<!-- [![Svelte](https://img.shields.io/badge/Svelte-5-ff7341)](https://svelte.dev/) -->

## 简介

Merfolk Editor 提供了创建和编辑 Mermaid 流程图的流畅体验：

- **可视化编辑**：在交互式画布上拖拽节点、绘制连线、调整形状
- **代码同步**：直接编辑 Mermaid 代码，变更即时反映到画布
- **双向同步**：可视化操作自动更新 Mermaid 代码
- **自动布局**：内置 Dagre 布局算法，一键整理图表

TODO:编辑器演示

## 功能特性

| 功能 | 描述 |
|------|------|
| 可视化画布 | 基于 D3.js 的 SVG 渲染，支持缩放和平移 |
| 节点操作 | 添加、编辑、移动、删除节点 |
| 边连接 | 从端口拖拽创建连线 |
| 代码编辑器 | 实时 Mermaid 代码同步 |
| 自动布局 | 一键整理图表结构 |
| 命令模式 | 完整的撤销/重做支持 |
| 键盘快捷键 | 高效的纯键盘操作 |

## 支持的图表类型

| 类型 | 支持程度 |
|------|----------|
| Flowchart（流程图） | 完全支持（可视化编辑 + 代码同步） |
| 其他类型（时序图、类图、状态图等） | 仅支持预览（只读） |

> 注意：当前版本专注于 **Flowchart** 的完整编辑体验，其他 Mermaid 图表类型可正常渲染和预览，但无法进行可视化编辑。


## 开发

```bash
# 安装依赖
pnpm install

# 启动开发服务器
pnpm dev

# 运行测试
pnpm test

# 类型检查
pnpm check

# 构建库
pnpm build
```

## 技术栈

- **Svelte** - UI 框架
- **TypeScript** - 类型安全
- **D3.js** - SVG 渲染
- **@dagrejs/dagre** - 自动布局
- **Vitest** - 单元测试

## 引用

- [Mermaid.js](https://mermaid.js.org/) - 图表语法
- [D3.js](https://d3js.org/) - 数据可视化
- [Dagre](https://github.com/dagrejs/dagre) - 图形布局
