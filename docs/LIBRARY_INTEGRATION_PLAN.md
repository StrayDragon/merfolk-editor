# Merfolk Editor 库化与集成规划

## 1. 概述

本文档规划 Merfolk Editor 作为可嵌入库的架构设计和集成方案。

## 2. 目标平台

| 平台 | 优先级 | 集成方式 | 状态 |
|------|--------|---------|------|
| Web (Vanilla JS) | P0 | NPM 包 | 🟡 基础完成 |
| React/Vue/Svelte | P0 | 组件包装 | 🔴 待实现 |
| VSCode Extension | P1 | Webview | 🔴 待实现 |
| Obsidian Plugin | P1 | iframe/embed | 🔴 待实现 |
| Electron App | P2 | 直接嵌入 | 🔴 待实现 |

## 3. 库架构设计

### 3.1 分层架构

```
┌─────────────────────────────────────────────────────┐
│                    Integration Layer                 │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐   │
│  │ VSCode  │ │Obsidian │ │  React  │ │   Vue   │   │
│  └────┬────┘ └────┬────┘ └────┬────┘ └────┬────┘   │
└───────┼───────────┼───────────┼───────────┼─────────┘
        │           │           │           │
┌───────▼───────────▼───────────▼───────────▼─────────┐
│                    API Layer                         │
│  ┌──────────────────────────────────────────────┐   │
│  │              MerfolkEditor API               │   │
│  │  - getCode() / setCode()                     │   │
│  │  - on() / off() / emit()                     │   │
│  │  - configure()                               │   │
│  │  - getModel() / setModel()                   │   │
│  └──────────────────────────────────────────────┘   │
└─────────────────────────┬───────────────────────────┘
                          │
┌─────────────────────────▼───────────────────────────┐
│                    Core Layer                        │
│  ┌────────────┐ ┌────────────┐ ┌────────────┐       │
│  │   Parser   │ │ SyncEngine │ │ Serializer │       │
│  └────────────┘ └────────────┘ └────────────┘       │
│  ┌────────────┐ ┌────────────┐ ┌────────────┐       │
│  │   Model    │ │  Command   │ │  History   │       │
│  └────────────┘ └────────────┘ └────────────┘       │
└─────────────────────────┬───────────────────────────┘
                          │
┌─────────────────────────▼───────────────────────────┐
│                    UI Layer (Optional)               │
│  ┌──────────────────────────────────────────────┐   │
│  │           Svelte Components                  │   │
│  │  - InteractiveCanvas                         │   │
│  │  - CodePanel                                 │   │
│  │  - Toolbars                                  │   │
│  └──────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────┘
```

### 3.2 模块划分

```
packages/
├── @merfolk/core          # 核心逻辑（无 UI）
│   ├── parser/
│   ├── serializer/
│   ├── model/
│   ├── sync/
│   └── command/
│
├── @merfolk/editor        # 完整编辑器（含 UI）
│   ├── components/
│   ├── canvas/
│   └── lib/
│
├── @merfolk/react         # React 包装
├── @merfolk/vue           # Vue 包装
├── @merfolk/vscode        # VSCode 扩展
└── @merfolk/obsidian      # Obsidian 插件
```

## 4. API 设计

### 4.1 核心 API

```typescript
// 创建编辑器
const editor = new MerfolkEditor(container, {
  // 初始配置
  initialCode?: string;
  theme?: 'light' | 'dark' | 'auto';
  locale?: string;
  readonly?: boolean;
  
  // 功能开关
  features?: {
    codePanel?: boolean;
    toolbar?: boolean;
    minimap?: boolean;
    dragEdgeCreation?: boolean;
  };
  
  // 回调
  onCodeChange?: (code: string) => void;
  onSelectionChange?: (nodeIds: string[]) => void;
  onError?: (error: Error) => void;
});

// 代码操作
editor.getCode(): string;
editor.setCode(code: string): void;
editor.updateCode(updater: (code: string) => string): void;

// 模型操作
editor.getModel(): FlowchartModel;
editor.addNode(node: NodeData): string;
editor.removeNode(nodeId: string): void;
editor.updateNode(nodeId: string, data: Partial<NodeData>): void;
editor.addEdge(source: string, target: string, options?: EdgeOptions): string;
editor.removeEdge(edgeId: string): void;

// 视图操作
editor.zoomIn(): void;
editor.zoomOut(): void;
editor.zoomTo(scale: number): void;
editor.fitToView(): void;
editor.panTo(x: number, y: number): void;
editor.focusNode(nodeId: string): void;

// 选择操作
editor.select(nodeIds: string[]): void;
editor.selectAll(): void;
editor.clearSelection(): void;
editor.getSelection(): string[];

// 历史操作
editor.undo(): void;
editor.redo(): void;
editor.canUndo(): boolean;
editor.canRedo(): boolean;

// 布局持久化
editor.exportPositions(): Record<string, Position>;
editor.importPositions(positions: Record<string, Position>): void;

// 生命周期
editor.destroy(): void;
```

### 4.2 事件系统

```typescript
// 事件监听
editor.on('codeChange', (code: string) => {});
editor.on('selectionChange', (nodeIds: string[]) => {});
editor.on('nodeAdd', (node: NodeData) => {});
editor.on('nodeRemove', (nodeId: string) => {});
editor.on('nodeUpdate', (nodeId: string, data: Partial<NodeData>) => {});
editor.on('edgeAdd', (edge: EdgeData) => {});
editor.on('edgeRemove', (edgeId: string) => {});
editor.on('zoomChange', (scale: number) => {});
editor.on('panChange', (x: number, y: number) => {});
editor.on('error', (error: Error) => {});

// 移除监听
editor.off('codeChange', handler);

// 一次性监听
editor.once('ready', () => {});
```

### 4.3 无头模式 (Headless)

```typescript
import { MerfolkCore } from '@merfolk/core';

// 纯逻辑操作，无 UI
const core = new MerfolkCore();

// 解析代码
const model = core.parse(mermaidCode);

// 修改模型
model.addNode({ id: 'X', label: 'New Node' });
model.addEdge('A', 'X');

// 序列化
const newCode = core.serialize(model);
```

## 5. 集成方案

### 5.1 VSCode Extension

```
vscode-merfolk/
├── src/
│   ├── extension.ts          # 扩展入口
│   ├── MerfolkEditorProvider.ts  # Webview Provider
│   ├── commands.ts           # 命令注册
│   └── utils/
│       ├── messaging.ts      # Webview 消息通信
│       └── fileUtils.ts      # 文件操作
├── webview/
│   ├── index.html
│   └── main.ts              # 嵌入 @merfolk/editor
├── package.json
└── README.md
```

**核心功能：**

1. **文件关联**：`.mmd`, `.mermaid` 文件自动打开
2. **双向同步**：编辑器 ↔ 文本文件
3. **主题适配**：跟随 VSCode 主题
4. **命令支持**：
   - `merfolk.openPreview` - 打开预览
   - `merfolk.exportSvg` - 导出 SVG
   - `merfolk.exportPng` - 导出 PNG

**消息协议：**

```typescript
// Webview -> Extension
interface WebviewMessage {
  type: 'codeChange' | 'ready' | 'error';
  payload: any;
}

// Extension -> Webview
interface ExtensionMessage {
  type: 'setCode' | 'setTheme' | 'setConfig';
  payload: any;
}
```

### 5.2 Obsidian Plugin

```
obsidian-merfolk/
├── src/
│   ├── main.ts              # 插件入口
│   ├── MerfolkView.ts       # 自定义视图
│   ├── settings.ts          # 设置面板
│   └── utils/
│       └── vaultUtils.ts    # Vault 操作
├── styles.css
├── manifest.json
└── README.md
```

**核心功能：**

1. **代码块渲染**：```` ```merfolk ```` 代码块
2. **独立视图**：专用编辑视图
3. **内部链接**：支持 `[[]]` 链接语法
4. **主题适配**：跟随 Obsidian 主题

**集成方式：**

```typescript
// 代码块处理器
this.registerMarkdownCodeBlockProcessor('merfolk', async (source, el) => {
  const editor = new MerfolkEditor(el, {
    initialCode: source,
    readonly: !this.settings.editableCodeBlocks,
    onCodeChange: (code) => {
      // 更新源文件
    }
  });
});
```

### 5.3 React 包装

```typescript
// @merfolk/react
import { MerfolkEditor } from '@merfolk/react';

function App() {
  const [code, setCode] = useState(initialCode);
  const editorRef = useRef<MerfolkEditorRef>(null);
  
  return (
    <MerfolkEditor
      ref={editorRef}
      code={code}
      onChange={setCode}
      theme="dark"
      onNodeClick={(nodeId) => console.log('Clicked:', nodeId)}
    />
  );
}

// Hook 用法
function App() {
  const { editor, code, setCode } = useMerfolkEditor({
    initialCode: '...',
  });
  
  return <div ref={editor} />;
}
```

### 5.4 Vue 包装

```vue
<!-- @merfolk/vue -->
<template>
  <MerfolkEditor
    v-model="code"
    theme="dark"
    @node-click="onNodeClick"
  />
</template>

<script setup>
import { MerfolkEditor } from '@merfolk/vue';

const code = ref(initialCode);
const onNodeClick = (nodeId) => console.log('Clicked:', nodeId);
</script>
```

## 6. 主题系统

### 6.1 CSS 变量

```css
:root {
  /* 颜色 */
  --merfolk-bg-primary: #ffffff;
  --merfolk-bg-secondary: #f5f5f5;
  --merfolk-text-primary: #333333;
  --merfolk-text-secondary: #666666;
  --merfolk-border-color: #e0e0e0;
  --merfolk-accent-color: #1976d2;
  
  /* 节点 */
  --merfolk-node-bg: #e3f2fd;
  --merfolk-node-border: #90caf9;
  --merfolk-node-selected: #1976d2;
  
  /* 边 */
  --merfolk-edge-color: #333333;
  --merfolk-edge-selected: #1976d2;
  
  /* 尺寸 */
  --merfolk-toolbar-height: 40px;
  --merfolk-border-radius: 4px;
}

/* 暗色主题 */
[data-theme="dark"] {
  --merfolk-bg-primary: #1e1e1e;
  --merfolk-bg-secondary: #252526;
  --merfolk-text-primary: #ffffff;
  /* ... */
}
```

### 6.2 主题 API

```typescript
// 预设主题
editor.setTheme('light');
editor.setTheme('dark');
editor.setTheme('auto'); // 跟随系统

// 自定义主题
editor.setTheme({
  name: 'custom',
  colors: {
    bgPrimary: '#ffffff',
    accentColor: '#ff5722',
    // ...
  }
});
```

## 7. 国际化

### 7.1 语言文件

```typescript
// locales/zh-CN.ts
export default {
  toolbar: {
    undo: '撤销',
    redo: '重做',
    zoomIn: '放大',
    zoomOut: '缩小',
    fitToView: '适应视图',
  },
  node: {
    add: '添加节点',
    edit: '编辑节点',
    delete: '删除节点',
  },
  // ...
};
```

### 7.2 国际化 API

```typescript
// 设置语言
editor.setLocale('zh-CN');
editor.setLocale('en-US');

// 自定义翻译
editor.setLocale({
  code: 'custom',
  messages: {
    // ...
  }
});
```

## 8. 实施路线图

### Phase 1: 库 API 稳定化（2 周）

- [ ] 完善事件系统
- [ ] 添加主题系统基础
- [ ] 统一错误处理
- [ ] API 文档

### Phase 2: 核心分离（2 周）

- [ ] 分离 `@merfolk/core`
- [ ] 无头模式实现
- [ ] 单元测试补充

### Phase 3: 框架包装（2 周）

- [ ] `@merfolk/react` 实现
- [ ] `@merfolk/vue` 实现
- [ ] 示例项目

### Phase 4: 编辑器插件（4 周）

- [ ] VSCode 扩展 MVP
- [ ] Obsidian 插件 MVP
- [ ] E2E 测试

### Phase 5: 生态完善（持续）

- [ ] 更多图类型支持
- [ ] 插件系统
- [ ] 协作功能
- [ ] 模板库

## 9. 技术决策

### 9.1 打包策略

| 包 | 格式 | 目标 |
|----|------|------|
| @merfolk/core | ESM + CJS + Types | Node + Browser |
| @merfolk/editor | ESM + IIFE + Types | Browser |
| @merfolk/react | ESM + Types | React 18+ |
| @merfolk/vue | ESM + Types | Vue 3+ |

### 9.2 依赖管理

- **Mermaid**: Peer dependency，用户自行安装
- **Svelte**: 内部依赖，编译后移除
- **D3**: 内部依赖，可选 tree-shaking

### 9.3 版本策略

- 遵循 Semantic Versioning
- Core 和 Editor 版本锁定
- 框架包装独立版本

## 10. 风险与对策

| 风险 | 影响 | 对策 |
|------|------|------|
| Mermaid 版本更新 | 解析兼容性 | 版本锁定 + 兼容测试 |
| 浏览器兼容性 | 功能异常 | 特性检测 + Polyfill |
| 包体积过大 | 加载慢 | Tree-shaking + 懒加载 |
| API 变更 | 破坏性更新 | 版本策略 + 迁移指南 |

