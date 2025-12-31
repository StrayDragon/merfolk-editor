# Merfolk Editor

一款支持 Mermaid 代码与可视化画布双向同步的流程图编辑器

<!-- [![NPM Version](https://img.shields.io/npm/v/merfolk-editor)](https://www.npmjs.com/package/merfolk-editor) -->
<!-- [![License](https://img.shields.io/npm/l/merfolk-editor)](LICENSE) -->
<!-- [![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue)](https://www.typescriptlang.org/) -->
<!-- [![Svelte](https://img.shields.io/badge/Svelte-5-ff7341)](https://svelte.dev/) -->

> [!tip]
>
> 写这个编辑器主要是希望有一个轻量级方案, 你也可以选择继续使用官方套件!
> 
> Mermaid官方预览:     [Online FlowChart & Diagrams Editor - Mermaid Live Editor](https://mermaid.live/edit#pako:eNpVkU9vgzAMxb9K5NMm0QpKC00Ok1a69dJpO_Q06CEqhkQrCQpBXQd89wUq7Y9Ptt_vPR_cwUnnCAyKs76cBDeWHLaZIq4e00QY2diKN0cymz30O7Sk0gqvPdnc7TRphK5rqcr7G78ZIZJ0-xFDYoVUH8NNSib_q8KebNM9r62uj3-Vw0X35CmVb8LF_1eEQed6TgvOCj47cUMSbo7gQWlkDm53btCDCk3Fxxm60Z2BFVhhBsy1ORa8PdsMMjU4X83Vu9YVMGta5zS6LcVPTlvn3OJW8tLwXwRVjibRrbLAllMCsA4-gQU-na99GgerRexTGgUeXB2yntMwXvlxtKAhXa7CwYOv6aQ_X7u9qwWNo2DpR6EHmEurzcvtC9Mzhm-Eg3xb)
> 
> Mermaid官方可UI编辑: [Mermaid Chart - Create complex, visual diagrams with text.](https://www.mermaidchart.com/play?utm_source=mermaid_live_editor&utm_medium=toggle#pako:eNpVjLEOgjAURX_lpZMO_QEGEynKQqIDW-3wUottlL6mNCGG8u-CLHrXc86dmKa7YQXrXjRqizFBW908LDtKYaMbUo-DAs4PuTYJevLmnaHc1QSDpRCcf-w3v1wlEFOzagaSdf45b0h8-4s3GSrZYEgU1C9pR8pwku5ql_t_YqNZqrPssOiQa4wgMCo2fwBnHTpc)

## 简介

Merfolk Editor 提供了创建和编辑 Mermaid 流程图的流畅体验:

- **可视化编辑**:在交互式画布上拖拽节点、绘制连线、调整形状
- **代码同步**:直接编辑 Mermaid 代码,变更即时反映到画布
- **双向同步**:可视化操作自动更新 Mermaid 代码
- **自动布局**:内置 Dagre 布局算法,一键整理图表


[演示](https://github.com/user-attachments/assets/8c084ad8-12c6-4dad-a089-b0c4dc6c2ba1)

## 功能特性

| 功能 | 描述 |
|------|------|
| 可视化画布 | 基于 D3.js 的 SVG 渲染,支持缩放和平移 |
| 节点操作 | 添加、编辑、移动、删除节点 |
| 边连接 | 从端口拖拽创建连线 |
| 代码编辑器 | 实时 Mermaid 代码同步 |
| 自动布局 | 一键整理图表结构 |
| 键盘快捷键 | 高效的纯键盘操作 |

## 支持的图表类型

| 类型 | 支持程度 |
|------|----------|
| Flowchart(流程图) | 完全支持(可视化编辑 + 代码同步) |
| 其他类型(时序图、类图、状态图等) | 仅支持预览(只读) |

> 注意:当前版本专注于 **Flowchart** 的完整编辑体验,其他 Mermaid 图表类型可正常渲染和预览,但无法进行可视化编辑.


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

## Demo

See `demo/README.md` for the embedded ESM demo and the standalone HTML demo.

## 作为库使用

### 安装 (GitHub Release Tag)

```bash
npm i github:straydragon/merfolk-editor#v0.1.0
# 或
npm i https://github.com/straydragon/merfolk-editor.git#v0.1.0

# 需要同时安装 peerDependencies
npm i mermaid d3 @dagrejs/dagre svelte
```

> 提示: 若希望直接从 tag 使用已构建产物,请确保 tag 对应提交包含 `dist/` 目录,或保持 `prepare` 可用以在安装时构建。

### 快速上手 (提供完整页面)

```ts
import MerfolkEditor from 'merfolk-editor';
import 'merfolk-editor/style';

const container = document.getElementById('app')!;
const editor = new MerfolkEditor(container, {
  initialCode: 'flowchart TB\nA-->B',
  onCodeChange: (code) => {
    console.log(code);
  },
});
```

```css
#app {
  width: 100vw;
  height: 100vh;
}
```

### Standalone (IIFE/UMD, 含依赖)

适合 VS Code Webview / 纯 HTML 页面，脚本会在全局暴露 `MerfolkEditor`。

```html
<link rel="stylesheet" href="./node_modules/merfolk-editor/dist/standalone/merfolk-editor.css" />
<script src="./node_modules/merfolk-editor/dist/standalone/merfolk-editor.iife.js"></script>
<div id="app"></div>
<script>
  const editor = new window.MerfolkEditor(document.getElementById('app'), {
    initialCode: 'flowchart TB\nA-->B',
  });
<\/script>
```

### 进阶选项 (示例)

```ts
const editor = new MerfolkEditor(container, {
  initialCode: 'flowchart TB\nA-->B',
  readOnly: false,
  showCodePanel: true,
  onCodeChange: (code, meta) => {
    console.log(meta.source, code);
  },
});
```

### Svelte 组件方式

```svelte
<script lang="ts">
  import { Editor } from 'merfolk-editor';
  import 'merfolk-editor/style';

  let code = `flowchart TB
    A-->B
  `;

  const handleChange = (next: string) => {
    code = next;
  };
</script>

<Editor initialCode={code} onCodeChange={handleChange} />
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
