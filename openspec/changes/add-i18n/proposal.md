## Why

当前所有 UI 文本硬编码在组件中（中文），无法支持国际化。虽然 `EditorStrings` 接口已定义，但未被实际使用。作为开源库，需要支持多语言以扩大用户群。

## What Changes

- 实现 i18n 模块，支持语言包加载和切换
- 提供中文（zh-CN）和英文（en-US）两种预设语言
- 提供 `editor.setLocale()` API
- 所有组件使用 i18n 函数获取文本

## Impact

- 受影响的规范：library-api（新增 i18n 相关要求）
- 受影响的代码：
  - `src/lib/i18n/` (新增目录)
  - `src/lib/i18n/index.ts`
  - `src/lib/i18n/zh-CN.ts`
  - `src/lib/i18n/en-US.ts`
  - `src/lib/types.ts` (更新 EditorStrings)
  - `src/lib/index.ts` (新增 setLocale API)
  - `src/components/*.svelte` (使用 i18n 函数)
