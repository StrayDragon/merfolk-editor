# Merfolk Editor

一个支持双向同步的 Mermaid 流程图可视化编辑器。通过拖拽节点编辑图形，代码自动更新，也可以在代码中修改，图形实时同步。

[MermaidChart:./docs/plan/architecture.mmd@overview]

## 特性

- ✨ **无限画布** - 支持平移和缩放，画布大小不受限制
- 🎯 **双向同步** - 可视化编辑与代码实时双向同步
- 🖱️ **拖拽编辑** - 直接拖拽节点调整布局
- ➕ **添加/删除** - 支持动态添加/删除节点和边
- 🎨 **边创建模式** - 点击式创建连接边
- 🔧 **可嵌入** - 轻量级库，可嵌入到 VSCode、网页等应用中
- 📦 **TypeScript** - 完整的类型支持

## 快速开始

### 基本使用

```html
<!DOCTYPE html>
<html>
<head>
  <script type="module">
    import MerfolkEditor from 'merfolk-editor';

    const editor = new MerfolkEditor(document.getElementById('editor'), {
      initialCode: `
        flowchart TD
          A[Start] --> B{Decision}
          B -->|Yes| C[Process 1]
          B -->|No| D[Process 2]
          C --> E[End]
          D --> E
      `,
      onCodeChange: (code) => {
        console.log('Code updated:', code);
      }
    });
  </script>
</head>
<body>
  <div id="editor" style="width: 100%; height: 80vh;"></div>
</body>
</html>
```

### NPM 安装

```bash
npm install merfolk-editor
# 或
pnpm add merfolk-editor
```

### ES 模块

```javascript
import MerfolkEditor from 'merfolk-editor';

const editor = new MerfolkEditor(container, {
  initialCode: 'flowchart LR\n    A --> B --> C',
  onCodeChange: (code) => {
    // 处理代码变更
  }
});
```

## API 参考

### 构造函数

```typescript
const editor = new MerfolkEditor(container: HTMLElement, options?: EditorOptions)
```

**选项:**

- `initialCode?: string` - 初始 Mermaid 代码
- `onCodeChange?: (code: string) => void` - 代码变更回调
- `sync?: SyncEngineOptions` - 同步引擎选项

### 方法

#### 代码操作

- `getCode(): string` - 获取当前代码
- `setCode(code: string): void` - 设置代码

#### 节点操作

- `removeNode(nodeId: string): void` - 删除节点
- `setNodePosition(nodeId: string, x: number, y: number): void` - 设置节点位置
- `getNodePosition(nodeId: string): { x, y } | undefined` - 获取节点位置

#### 视图控制

- `zoomIn(): void` - 放大
- `zoomOut(): void` - 缩小
- `resetZoom(): void` - 重置缩放
- `fitToView(): void` - 适应视图

#### UI 控制

- `showCodePanel(): void` - 显示代码面板
- `hideCodePanel(): void` - 隐藏代码面板

#### 位置管理

- `getAllNodePositions(): Record<string, { x, y }>` - 获取所有节点位置
- `exportPositions(): Record<string, { x, y }>` - 导出位置数据
- `importPositions(positions: Record<string, { x, y }>): void` - 导入位置数据

#### 生命周期

- `destroy(): void` - 销毁编辑器实例

### 类型定义

```typescript
interface NodeData {
  id: string;
  text: string;
  shape?: ShapeType;
  cssClasses?: string[];
  position?: { x: number; y: number };
}

interface EdgeData {
  id: string;
  source: string;
  target: string;
  text?: string;
  stroke?: StrokeType;
  arrowStart?: ArrowType;
  arrowEnd?: ArrowType;
}
```

## VSCode 扩展示例

Merfolk Editor 可以轻松集成到 VSCode 扩展中：

```javascript
// VSCode 扩展集成示例
const { MerfolkEditor } = require('merfolk-editor');

const panel = vscode.window.createWebviewPanel(
  'mermaidPreview',
  'Mermaid Preview',
  vscode.ViewColumn.Two
);

// 初始化编辑器
panel.webview.html = `
  <div id="editor"></div>
  <script>
    import('/node_modules/merfolk-editor/dist/lib/index.js').then(({ default: MerfolkEditor }) => {
      const editor = new MerfolkEditor(document.getElementById('editor'), {
        onCodeChange: (code) => {
          // 同步回 VSCode 文档
        }
      });
    });
  </script>
`;
```

完整示例请参考 `examples/vscode-extension.js`

## 技术架构

[MermaidChart:./docs/plan/architecture.mmd@tech-stack]

### 核心模块

1. **SyncEngine** - 同步引擎，负责代码与图形的双向同步
2. **InteractiveCanvas** - 交互式画布组件
3. **Parser/Serializer** - Mermaid 代码解析和序列化
4. **Model** - 数据模型管理

### 设计原则

- **性能优先** - 使用 transform 进行缩放平移，避免重排
- **类型安全** - 完整的 TypeScript 类型定义
- **可扩展** - 模块化设计，易于扩展
- **轻量级** - 最小化依赖，按需加载

## 开发

### 安装依赖

```bash
pnpm install
```

### 开发模式

```bash
pnpm dev
```

### 构建

```bash
# 构建 Web 应用
pnpm build

# 构建库文件
pnpm build:lib
```

### 测试

```bash
# 单元测试
pnpm test

# 仅使用 Chromium 的端到端测试（Playwright）
pnpm test:e2e
```

> 已在脚本中使用系统的 `chromium` 可执行文件（通过 `PLAYWRIGHT_CHROMIUM_EXECUTABLE=$(command -v chromium)`），不需要额外参数。确保系统已安装 chromium 即可。

### 清理遗留文件

```bash
pnpm clean:artifacts
```

> 删除旧的 Cypress 目录与 Playwright 生成的临时测试输出，保持仓库整洁。

## 许可证

MIT License

## 贡献

欢迎提交 Issue 和 Pull Request！

## 相关链接

- [Mermaid 官方文档](https://mermaid.js.org/)
- [Svelte 官方文档](https://svelte.dev/)
- [VSCode 扩展开发指南](https://code.visualstudio.com/api)
