• 已修复：CJS require() 直接返回默认类 + 解决对话框 a11y 警告，并把 dts 构建错误清干净。

  变更要点

  - CJS 入口改为包装器，require('merfolk-editor') 直接拿到默认类，同时保留具名导出属性（cjs/index.cjs、package.json）
  - 对话框语义修正：role="dialog" 放到真正对话框容器并加 tabindex/aria-labelledby（src/components/EdgeEditDialog.svelte）
  - 修复 dts 报错：edgeId 类型、未用变量、.svelte 模块声明纳入 dts 构建（src/core/parser/MermaidParser.ts、src/vite-env.d.ts、vite.config.lib.ts）

  已跑命令

  - pnpm build:lib（无 a11y 报错；仍有默认+具名导出提示）

  可选下一步（如果你想）

  1. 消除 “default + named exports” 的构建提示（设置 Rollup output.exports: 'named'）
  2. 如果要发布到 npm，我可以补充 README 的库使用示例（ESM/CJS/样式引入）

  文件清单

  - package.json
  - cjs/index.cjs
  - src/components/EdgeEditDialog.svelte
  - src/core/parser/MermaidParser.ts
  - src/vite-env.d.ts
  - vite.config.lib.ts
