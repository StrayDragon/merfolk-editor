## 1. 类型定义

- [ ] 1.1 在 `src/lib/types.ts` 定义 `ThemeConfig` 接口
- [ ] 1.2 定义 `ThemePreset` 类型 (`'light' | 'dark' | 'auto'`)
- [ ] 1.3 定义 `ThemeColors` 接口（所有可定制颜色）

## 2. 主题模块实现

- [ ] 2.1 创建 `src/lib/theme.ts`
- [ ] 2.2 实现 `lightTheme` 预设
- [ ] 2.3 实现 `darkTheme` 预设
- [ ] 2.4 实现 `getSystemTheme()` 检测系统偏好
- [ ] 2.5 实现 `applyTheme(theme: ThemeConfig)` 应用 CSS 变量
- [ ] 2.6 实现 `watchSystemTheme()` 监听系统主题变化

## 3. CSS 变量定义

- [ ] 3.1 创建 `src/lib/theme.css`（或内联到 theme.ts）
- [ ] 3.2 定义所有颜色变量（背景、文本、边框、强调色）
- [ ] 3.3 定义节点相关变量（节点背景、边框、选中态）
- [ ] 3.4 定义边相关变量（线条颜色、选中态）
- [ ] 3.5 定义尺寸变量（工具栏高度、圆角等）

## 4. 组件样式迁移

- [ ] 4.1 审计所有组件中的硬编码颜色（使用 grep）
- [ ] 4.2 更新 `Editor.svelte` 使用 CSS 变量
- [ ] 4.3 更新 `Toolbar.svelte` 使用 CSS 变量
- [ ] 4.4 更新 `CodePanel.svelte` 使用 CSS 变量
- [ ] 4.5 更新 `ContextMenu.svelte` 使用 CSS 变量
- [ ] 4.6 更新 `*Dialog.svelte` 组件使用 CSS 变量
- [ ] 4.7 更新 `InteractiveCanvas.svelte` 使用 CSS 变量

## 5. API 集成

- [ ] 5.1 在 `MerfolkEditor` 类中添加 `setTheme()` 方法
- [ ] 5.2 在 `EditorOptions` 中添加 `theme` 选项
- [ ] 5.3 在 `Editor.svelte` 中接收并应用主题

## 6. 测试

- [ ] 6.1 单元测试：主题配置合并逻辑
- [ ] 6.2 单元测试：CSS 变量生成
- [ ] 6.3 E2E 测试：主题切换视觉验证

## 7. 文档

- [ ] 7.1 更新 README 添加主题配置示例
- [ ] 7.2 添加 JSDoc 注释
