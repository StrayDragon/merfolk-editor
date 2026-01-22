## Why

当前编辑器所有颜色和尺寸硬编码在 Svelte 组件中，无法适配不同宿主环境（如 VSCode 暗色主题、Obsidian 自定义主题）。作为可嵌入库，需要支持主题定制。

## What Changes

- 实现 CSS 变量驱动的主题系统
- 支持 `light` / `dark` / `auto`（跟随系统）三种预设主题
- 支持自定义主题对象
- 提供 `editor.setTheme()` API

## Impact

- 受影响的规范：library-api（新增 theme 相关要求）
- 受影响的代码：
  - `src/lib/theme.ts` (新增)
  - `src/lib/types.ts` (新增 ThemeConfig 类型)
  - `src/lib/index.ts` (新增 setTheme API)
  - `src/components/*.svelte` (更新样式引用 CSS 变量)
  - `src/components/Editor.svelte` (应用主题类)
