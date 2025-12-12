# Merfolk Editor - 开发进度

## 项目概述

Merfolk Editor 是一个可嵌入 VSCode/Electron 的 Mermaid Flowchart 可视化编辑器，支持：
- **双向实时同步**: 代码 ↔ 可视化
- **拖拽式编辑**: 节点移动、连线、属性编辑
- **嵌入友好**: 独立运行 + VSCode Webview 集成

## 技术栈

| 项目 | 选择 | 理由 |
|------|------|------|
| 前端框架 | **Svelte 5** | 代码可读性优先，编译时框架，使用 runes ($state, $effect) |
| 构建工具 | **Vite** | 快速开发体验，HMR 支持 |
| 图表渲染 | **Mermaid + D3.js** | 复用 Mermaid 渲染，D3 处理交互 |
| 布局算法 | **Dagre** | 自动布局计算 |
| 图表类型 | **Flowchart** | MVP 阶段专注 flowchart |

## 当前进度 (2024-12)

### ✅ 已完成

#### 1. 项目基础架构
- [x] Vite + Svelte 5 + TypeScript 项目搭建
- [x] 基本组件结构 (Editor, Canvas, CodePanel, Toolbar)
- [x] 开发服务器和构建配置

#### 2. 核心数据模型 (`src/core/`)
- [x] `FlowchartModel` - 图表数据模型（事件驱动）
- [x] `FlowNode` - 节点模型
- [x] `FlowEdge` - 边模型
- [x] `SubGraph` - 子图模型
- [x] `MermaidParser` - Mermaid 文本解析器
- [x] `MermaidSerializer` - 模型序列化为 Mermaid 文本

#### 3. 画布渲染 (`src/canvas/`)
- [x] `CanvasRenderer` - 自定义 D3.js 渲染器（用于调试对比）
- [x] `ShapeRenderer` - 形状渲染（rect, rounded, diamond, circle 等）
- [x] `EdgeRenderer` - 边渲染（curveBasis 曲线）
- [x] `DagreLayout` - Dagre 自动布局

#### 4. 交互式画布 (`src/components/InteractiveCanvas.svelte`) ⭐ 新完成
- [x] 使用 Mermaid 原生渲染，保证视觉一致性
- [x] 节点拖拽功能
- [x] 边路径动态重新计算
- [x] 边标签跟随更新
- [x] SVG viewBox 动态调整（适应节点移动）
- [x] 节点选择状态
- [x] 缩放和平移基础支持

#### 5. UI 组件
- [x] `Editor.svelte` - 主编辑器组件
- [x] `MermaidCanvas.svelte` - Mermaid 原生渲染（只读）
- [x] `InteractiveCanvas.svelte` - 交互式画布（可编辑）
- [x] `CodePanel.svelte` - 代码编辑面板
- [x] `Toolbar.svelte` - 工具栏
- [x] `DebugCompare.svelte` - 调试对比视图

#### 6. 数据提取 (`src/core/extractor/`)
- [x] `MermaidDataExtractor` - 从 Mermaid 提取结构化数据

### 🚧 进行中 / 待完成

#### 1. 交互增强
- [ ] 无限画布支持
- [ ] 鼠标滚轮缩放（已有基础代码）
- [ ] 多选节点
- [ ] 框选功能
- [ ] 连线创建（拖拽创建边）

#### 2. 双向同步
- [ ] 拖拽后更新 Mermaid 代码
- [ ] 代码变更实时反映到画布
- [ ] 位置信息持久化

#### 3. 编辑功能
- [ ] 节点文本编辑
- [ ] 节点形状修改
- [ ] 边标签编辑
- [ ] 添加/删除节点
- [ ] 添加/删除边

#### 4. 历史管理
- [ ] 撤销/重做 (Command 模式)
- [ ] 操作历史记录

#### 5. VSCode 集成
- [ ] Webview Bridge
- [ ] Custom Editor Provider
- [ ] 主题同步

## 文件结构

```
merfolk-editor/
├── src/
│   ├── main.ts                    # 应用入口
│   ├── App.svelte                 # 主应用
│   ├── DebugApp.svelte            # 调试应用
│   │
│   ├── core/                      # 核心模块
│   │   ├── model/                 # 数据模型
│   │   │   ├── FlowchartModel.ts
│   │   │   ├── Node.ts
│   │   │   ├── Edge.ts
│   │   │   └── SubGraph.ts
│   │   ├── parser/                # 解析器
│   │   │   └── MermaidParser.ts
│   │   ├── serializer/            # 序列化器
│   │   │   └── MermaidSerializer.ts
│   │   └── extractor/             # 数据提取
│   │       └── MermaidDataExtractor.ts
│   │
│   ├── canvas/                    # 画布渲染层
│   │   ├── CanvasRenderer.ts
│   │   ├── shapes/
│   │   │   └── ShapeRenderer.ts
│   │   ├── edges/
│   │   │   └── EdgeRenderer.ts
│   │   └── layout/
│   │       └── DagreLayout.ts
│   │
│   └── components/                # Svelte 组件
│       ├── Editor.svelte          # 主编辑器
│       ├── InteractiveCanvas.svelte # 交互式画布 ⭐
│       ├── MermaidCanvas.svelte   # Mermaid 原生渲染
│       ├── CodePanel.svelte       # 代码面板
│       ├── Toolbar.svelte         # 工具栏
│       └── DebugCompare.svelte    # 调试对比
│
├── docs/
│   └── source_ref/mermaid/        # Mermaid 源码参考
│
└── package.json
```

## 运行方式

```bash
# 安装依赖
pnpm install

# 开发模式
pnpm dev

# 访问
# 主编辑器: http://localhost:5177/
# 调试对比: http://localhost:5177/?debug=true

# 构建
pnpm build
```

## 技术决策记录

### 为什么使用 Mermaid 原生渲染 + 交互层？

我们尝试了多种方案：

1. **完全自定义渲染器** - 形状尺寸、边路径难以与 Mermaid 完全一致
2. **直接操作 Mermaid SVG** - 边标签位置更新困难
3. **Mermaid 渲染 + 交互层** ✅ - 最终采用

最终方案的优势：
- 渲染结果与 Mermaid CLI 完全一致
- 通过几何位置匹配建立节点-边关系
- 拖拽时动态重新计算边路径
- viewBox 自动调整适应节点移动

### 边路径计算

使用 D3.js 的 `curveBasis` 曲线，与 Mermaid 默认曲线一致：

```typescript
const lineGenerator = d3
  .line<{ x: number; y: number }>()
  .x((d) => d.x)
  .y((d) => d.y)
  .curve(d3.curveBasis);
```

### 节点-边关联

通过几何位置匹配：
1. 获取边路径的起点和终点
2. 查找距离最近的节点
3. 建立 source/target 关系

## ✅ 已完成 (2024-12)

### 7. 交互增强
- [x] 无限画布支持 - 移除 viewBox 限制
- [x] 鼠标滚轮缩放（以鼠标位置为中心）
- [x] 网格背景显示
- [x] 缩放和平移控制

### 8. 双向同步
- [x] 拖拽后更新 Mermaid 代码（位置信息单独存储）
- [x] 代码变更实时反映到画布
- [x] SyncEngine 同步引擎实现
- [x] 位置信息持久化

### 9. 编辑功能
- [x] 添加/删除节点（Toolbar 按钮 + Delete 键）
- [x] 添加/删除边（点击式边创建模式）
- [x] 节点选择和操作
- [x] 边创建模式切换

### 10. 库封装
- [x] MerfolkEditor 主类 API
- [x] ES 模块导出
- [x] TypeScript 类型定义
- [x] 构建配置（vite.config.lib.ts）
- [x] VSCode 扩展示例
- [x] 完整的 README 文档

## 🚧 进行中

暂无

## 🐛 已知 Bug（记录但不实现修复）

### 1. 画布可见范围限制
**描述**: 当前的画布虽然支持无限缩放和平移，但是 SVG 元素仍然被限制在一个初始化的框内，移动节点超出初始范围后会被遮盖。

**表现**:
- 初始渲染时只能看到图表所在区域
- 拖拽节点到远处会消失在"边界"外
- 即使缩放也无法看到超出初始范围的区域

**原因**: SVG 元素的裁剪/遮罩机制没有完全移除

### 2. 边重复引用丢失
**描述**: 初始渲染时与 Mermaid 原生输出一致，但移动任何节点后，存在双向引用的两个节点之间的两条边会合并为一条。

**表现**:
- 示例中 `A <--> B` 初始显示为两条相反的箭头
- 移动节点后，只显示一条边（通常是后渲染的那条）
- Debug 节点的双向连接丢失了一条边

**原因**:
- 边的路径重新计算时，可能使用了相同的 ID 或覆盖了相同的路径
- Mermaid 原生渲染中的多边处理与自定义重绘逻辑不一致
- `updateEdgePath` 可能没有正确处理多条并行边的情况

**技术细节**:
```javascript
// 问题可能在于 EdgeInfo 的创建
// 相同的 source-target 对创建了多个 edgeInfo
// 但在更新时只保留了最后一个
```

## 文件结构更新

```
merfolk-editor/
├── src/
│   ├── lib/                      # 库入口 ✨
│   │   └── index.ts              # MerfolkEditor 类定义
│   ├── core/
│   │   ├── sync/                 # 同步引擎 ✨
│   │   │   └── SyncEngine.ts     # 双向同步实现
│   │   └── ...
│   └── components/
│       ├── InteractiveCanvas.svelte # 支持边创建模式 ✨
│       └── ...
├── examples/                     # 示例文件 ✨
│   ├── basic.html               # 基本使用示例
│   └── vscode-extension.js      # VSCode 集成示例
├── dist/                        # 构建输出
│   ├── lib/                     # 库文件
│   └── style.css               # 样式文件
└── docs/
    └── PROGRESS.md             # 本文档
```

## 使用方式

### 基本嵌入

```javascript
import MerfolkEditor from 'merfolk-editor';

const editor = new MerfolkEditor(container, {
  initialCode: 'flowchart TD\n    A --> B',
  onCodeChange: (code) => console.log(code)
});
```

### API 方法

- `addNode()` - 添加节点
- `removeNode()` - 删除节点
- `addEdge()` - 添加边
- `removeEdge()` - 删除边
- `setNodePosition()` - 设置节点位置
- `zoomIn/Out()` - 缩放控制
- `toggleEdgeCreationMode()` - 边创建模式

## 技术实现亮点

### 无限画布
- 使用 CSS transform 实现高性能缩放平移
- 鼠标滚轮以当前位置为中心缩放
- 网格背景提供视觉参考

### 边创建模式
- 点击源节点高亮显示（绿色虚线动画）
- 点击目标节点创建边
- Escape 键或再次点击源节点取消

### 同步策略
- 位置信息单独存储（不写入 Mermaid 代码）
- 仅结构变更（增删节点/边）触发代码更新
- 防抖处理避免频繁更新
