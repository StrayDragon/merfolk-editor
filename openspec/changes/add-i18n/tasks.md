## 1. 语言包定义

- [ ] 1.1 创建 `src/lib/i18n/types.ts` 定义 `Messages` 接口
- [ ] 1.2 创建 `src/lib/i18n/zh-CN.ts` 中文语言包
- [ ] 1.3 创建 `src/lib/i18n/en-US.ts` 英文语言包

## 2. i18n 核心模块

- [ ] 2.1 创建 `src/lib/i18n/index.ts`
- [ ] 2.2 实现 `getLocale()` 获取当前语言
- [ ] 2.3 实现 `setLocale(locale)` 设置语言
- [ ] 2.4 实现 `t(key)` 翻译函数
- [ ] 2.5 实现 `detectBrowserLocale()` 检测浏览器语言

## 3. Svelte 集成

- [ ] 3.1 创建 `src/lib/i18n/context.ts` Svelte context
- [ ] 3.2 在 `Editor.svelte` 中提供 i18n context
- [ ] 3.3 创建 `useI18n()` hook

## 4. 组件迁移

- [ ] 4.1 审计所有组件中的硬编码文本
- [ ] 4.2 更新 `Toolbar.svelte` 使用 `t()`
- [ ] 4.3 更新 `CodePanel.svelte` 使用 `t()`
- [ ] 4.4 更新 `ContextMenu.svelte` 使用 `t()`
- [ ] 4.5 更新 `NodeEditDialog.svelte` 使用 `t()`
- [ ] 4.6 更新 `EdgeEditDialog.svelte` 使用 `t()`
- [ ] 4.7 更新 `EdgeAddDialog.svelte` 使用 `t()`
- [ ] 4.8 更新 `ShapePanel.svelte` 使用 `t()`

## 5. API 集成

- [ ] 5.1 在 `MerfolkEditor` 类中添加 `setLocale()` 方法
- [ ] 5.2 在 `EditorOptions` 中添加 `locale` 选项
- [ ] 5.3 更新 `EditorStrings` 类型与 `Messages` 对齐

## 6. 测试

- [ ] 6.1 单元测试：语言切换
- [ ] 6.2 单元测试：翻译函数 fallback
- [ ] 6.3 E2E 测试：UI 文本显示

## 7. 文档

- [ ] 7.1 更新 README 添加 i18n 配置示例
- [ ] 7.2 添加自定义语言包示例
