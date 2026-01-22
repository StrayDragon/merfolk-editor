## Context

Merfolk Editor 作为可嵌入库，需要适配不同宿主环境：
- VSCode Webview 有 light/dark/high-contrast 主题
- Obsidian 支持自定义主题和 CSS snippets
- 普通网页可能有自己的设计系统

当前所有颜色硬编码在 Svelte 组件的 `<style>` 块中，无法动态修改。

## Goals / Non-Goals

**Goals:**
- CSS 变量驱动的主题系统
- 支持 light/dark/auto 预设
- 支持自定义主题
- 最小化对现有代码的侵入

**Non-Goals:**
- 主题编辑器 UI
- 主题持久化存储
- 动态加载外部主题文件

## Decisions

### Decision 1: CSS 变量方案

**内容**: 使用 CSS Custom Properties（CSS 变量）实现主题

**原因**:
- 原生支持，无需运行时 JS
- 可被外部 CSS 覆盖
- 性能优秀

**Alternatives considered**:
- CSS-in-JS：增加运行时开销，与 Svelte 风格不符
- SCSS 变量：需要编译时确定，不支持运行时切换
- Tailwind：需要引入额外依赖

### Decision 2: 变量命名约定

**内容**: 使用 `--merfolk-` 前缀避免冲突

```css
:root {
  --merfolk-bg-primary: #ffffff;
  --merfolk-text-primary: #333333;
  --merfolk-node-bg: #e3f2fd;
  --merfolk-edge-color: #333333;
}
```

**原因**: 避免与宿主应用的 CSS 变量冲突

### Decision 3: 主题应用方式

**内容**: 通过 `data-theme` 属性切换主题

```html
<div class="merfolk-editor" data-theme="dark">
  ...
</div>
```

**原因**:
- 不污染全局 `:root`
- 支持同页面多个编辑器不同主题
- 易于外部样式覆盖

### Decision 4: 系统主题检测

**内容**: 使用 `prefers-color-scheme` 媒体查询

```typescript
const getSystemTheme = () => 
  window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
```

**原因**: 标准 API，广泛支持

## Risks / Trade-offs

| 风险 | 影响 | 缓解措施 |
|------|------|----------|
| 遗漏硬编码颜色 | 主题不完整 | 使用 grep 全面审计 |
| 变量命名不一致 | 维护困难 | 建立命名规范文档 |
| 对比度问题 | 可访问性降低 | 遵循 WCAG 2.1 AA 标准 |

## Migration Plan

1. 定义 CSS 变量（不影响现有样式）
2. 逐步替换硬编码颜色
3. 添加 `setTheme()` API
4. 文档和示例

## Open Questions

- [ ] 是否需要支持 HSL 颜色格式便于计算？（暂定 hex）
- [ ] 是否需要颜色透明度变量？（暂定按需添加）
