# Mermaid 图类型调研报告

## 1. Mermaid 支持的所有图类型

根据 Mermaid 源码文档，目前支持以下 **21 种** 图类型：

| # | 图类型 | 关键字 | 交互复杂度 | 可视化编辑适合度 |
|---|--------|--------|-----------|-----------------|
| 1 | **Flowchart** | `flowchart`, `graph` | 中等 | ⭐⭐⭐⭐⭐ 非常适合 |
| 2 | **Sequence Diagram** | `sequenceDiagram` | 高 | ⭐⭐⭐ 适合 |
| 3 | **Class Diagram** | `classDiagram` | 高 | ⭐⭐⭐⭐ 适合 |
| 4 | **State Diagram** | `stateDiagram-v2` | 中等 | ⭐⭐⭐⭐ 适合 |
| 5 | **Entity Relationship** | `erDiagram` | 中等 | ⭐⭐⭐⭐ 适合 |
| 6 | **Gantt Chart** | `gantt` | 低 | ⭐⭐ 表格编辑更合适 |
| 7 | **Pie Chart** | `pie` | 低 | ⭐⭐ 表格编辑更合适 |
| 8 | **Git Graph** | `gitGraph` | 中等 | ⭐⭐⭐ 适合 |
| 9 | **User Journey** | `journey` | 低 | ⭐⭐ 表格编辑更合适 |
| 10 | **Mindmap** | `mindmap` | 中等 | ⭐⭐⭐⭐ 适合 |
| 11 | **Timeline** | `timeline` | 低 | ⭐⭐ 表格编辑更合适 |
| 12 | **Quadrant Chart** | `quadrantChart` | 低 | ⭐⭐⭐ 适合 |
| 13 | **XY Chart** | `xychart-beta` | 低 | ⭐⭐ 表格编辑更合适 |
| 14 | **Requirement Diagram** | `requirementDiagram` | 中等 | ⭐⭐⭐ 适合 |
| 15 | **Sankey Diagram** | `sankey-beta` | 中等 | ⭐⭐⭐ 适合 |
| 16 | **C4 Diagram** | `C4Context`, `C4Container`, `C4Component`, `C4Dynamic`, `C4Deployment` | 高 | ⭐⭐⭐⭐ 适合 |
| 17 | **Block Diagram** | `block-beta` | 中等 | ⭐⭐⭐⭐ 适合 |
| 18 | **Architecture Diagram** | `architecture-beta` | 高 | ⭐⭐⭐⭐ 适合 |
| 19 | **Packet Diagram** | `packet-beta` | 低 | ⭐⭐ 表格编辑更合适 |
| 20 | **Kanban** | `kanban` | 低 | ⭐⭐⭐ 适合 |
| 21 | **ZenUML** | `zenuml` | 高 | ⭐⭐⭐ 适合 |
| 22 | **Radar Chart** | `radar-beta` | 低 | ⭐⭐ 表格编辑更合适 |
| 23 | **Treemap** | `treemap-beta` | 中等 | ⭐⭐⭐ 适合 |

## 2. 当前 Merfolk Editor 支持状态

### ✅ 已完整支持

| 图类型 | 功能支持 |
|--------|---------|
| **Flowchart** | 节点增删改、边增删改、子图、样式类、拖拽连线、视图状态持久化 |

### 核心支持能力

- [x] 节点解析与渲染
- [x] 边解析与渲染（多种箭头、线型）
- [x] 子图 (Subgraph) 支持
- [x] 样式类 (classDef) 支持
- [x] 双向同步（代码 ↔ 画布）
- [x] 拖拽式连线创建
- [x] 节点位置持久化
- [x] Undo/Redo 历史
- [x] 缩放与平移

## 3. 图类型特征分析

### 3.1 基于图的类型（Graph-based）

这类图以节点和边为核心，非常适合可视化编辑：

| 类型 | 节点形态 | 边类型 | 特殊元素 |
|-----|---------|--------|---------|
| Flowchart | 多种形状 | 多种箭头/线型 | 子图 |
| State Diagram | 状态、起止点 | 转换 | 嵌套状态、并行 |
| Class Diagram | 类 | 关系（继承、组合等） | 属性、方法 |
| ER Diagram | 实体 | 关系（1:1, 1:N 等） | 属性 |
| Mindmap | 层级节点 | 隐式父子关系 | 图标 |
| Git Graph | 提交点 | 分支线 | 分支、合并 |
| C4 Diagram | 系统、容器、组件 | 依赖关系 | 边界 |

### 3.2 序列/时间线类型

这类图强调时序，交互模式不同：

| 类型 | 元素 | 交互特点 |
|-----|------|---------|
| Sequence Diagram | 参与者、消息 | 垂直时间轴，水平消息 |
| User Journey | 阶段、任务 | 线性流程 |
| Timeline | 时间段、事件 | 时间轴布局 |
| Gantt | 任务、依赖 | 甘特条形图 |

### 3.3 数据可视化类型

这类图主要展示数据，表格/表单编辑更合适：

| 类型 | 数据结构 | 建议编辑方式 |
|-----|---------|-------------|
| Pie Chart | 键值对 | 表格 |
| XY Chart | 数据系列 | 表格 |
| Quadrant Chart | 点坐标 | 表格 + 拖拽 |
| Sankey | 流量数据 | 表格 |
| Radar | 维度数据 | 表格 |

## 4. 交互编辑适合度评估

### 高优先级（非常适合可视化编辑）

1. **Flowchart** ✅ 已支持
2. **State Diagram** - 与 Flowchart 结构相似
3. **Class Diagram** - 需要属性/方法编辑面板
4. **ER Diagram** - 需要属性和关系编辑
5. **Mindmap** - 树形结构，适合拖拽

### 中优先级（适合可视化编辑）

6. **Sequence Diagram** - 需要特殊的时序布局
7. **Git Graph** - 分支操作较复杂
8. **C4 Diagram** - 多层级结构
9. **Block Diagram** - 网格布局

### 低优先级（表格编辑更合适）

10. **Gantt Chart** - 任务管理工具更合适
11. **Pie/XY/Radar Chart** - 数据表格更直观
12. **Timeline** - 列表编辑更合适

## 5. 技术挑战分析

### 5.1 解析器 (Parser) 扩展

每种图类型都有独特的语法，需要：
- 独立的解析器模块
- 统一的模型接口
- 解析错误处理

### 5.2 渲染器 (Renderer) 适配

Mermaid 原生渲染即可，但需要：
- 元素识别和交互绑定
- 不同图类型的坐标系处理
- 选择/高亮样式适配

### 5.3 编辑交互差异

| 图类型 | 核心交互 | 特殊需求 |
|--------|---------|---------|
| Flowchart | 节点拖拽、边连接 | 子图嵌套 |
| Sequence | 消息拖拽、参与者排序 | 垂直时间轴 |
| Class | 类编辑、关系连接 | 属性方法面板 |
| Mindmap | 节点拖拽、层级调整 | 树形布局 |

## 6. 库封装考虑

### 6.1 作为独立库的能力

当前 `MerfolkEditor` 类已具备基础库能力：

```typescript
// 创建编辑器
const editor = new MerfolkEditor(container, options);

// API
editor.getCode();           // 获取代码
editor.setCode(code);       // 设置代码
editor.zoomIn/Out/Reset();  // 缩放控制
editor.exportPositions();   // 导出布局
editor.destroy();           // 销毁实例
```

### 6.2 嵌入场景需求

| 平台 | 集成方式 | 特殊需求 |
|------|---------|---------|
| **VSCode** | Webview Extension | 消息通信、主题适配、文件系统访问 |
| **Obsidian** | Plugin (iframe/embed) | Markdown 集成、Vault 访问 |
| **Web App** | NPM 包 | 框架无关、CDN 分发 |
| **Electron** | 直接嵌入 | 原生能力访问 |

### 6.3 库化改进需求

1. **事件系统**：统一的事件发布/订阅
2. **主题系统**：CSS 变量、主题适配
3. **国际化**：多语言支持
4. **无头模式**：纯逻辑操作，无 UI
5. **插件系统**：扩展图类型支持

## 7. 结论与建议

### 7.1 短期目标（1-2 个月）

1. 完善 Flowchart 编辑体验
2. 库 API 稳定化
3. 文档和示例完善

### 7.2 中期目标（3-6 个月）

1. 支持 State Diagram
2. 支持 Class Diagram  
3. VSCode 插件 MVP
4. Obsidian 插件 MVP

### 7.3 长期目标（6-12 个月）

1. 支持 5+ 种图类型
2. 完整的插件生态
3. 企业级功能（协作、模板）

