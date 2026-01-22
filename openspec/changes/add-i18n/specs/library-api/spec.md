## ADDED Requirements

### Requirement: Locale Preset Support

系统必须（MUST）支持预设语言切换。

#### Scenario: 切换到英文

- **WHEN** 用户调用 `editor.setLocale('en-US')`
- **THEN** 所有 UI 文本显示为英文

#### Scenario: 切换到中文

- **WHEN** 用户调用 `editor.setLocale('zh-CN')`
- **THEN** 所有 UI 文本显示为中文

#### Scenario: 自动检测浏览器语言

- **WHEN** 用户未指定语言
- **AND** 浏览器语言为英文
- **THEN** 编辑器使用英文

### Requirement: Custom Locale Support

系统必须（MUST）支持自定义语言包。

#### Scenario: 使用自定义语言包

- **WHEN** 用户调用 `editor.setLocale({ code: 'ja-JP', messages: { ... } })`
- **THEN** 编辑器使用自定义翻译

#### Scenario: 通过初始化选项设置语言

- **WHEN** 用户创建编辑器 `new MerfolkEditor(container, { locale: 'en-US' })`
- **THEN** 编辑器以英文初始化

### Requirement: Translation Fallback

系统必须（MUST）在缺少翻译时使用 fallback。

#### Scenario: 缺少翻译键

- **WHEN** 当前语言包缺少某个翻译键
- **THEN** 使用默认语言（zh-CN）的翻译
- **OR** 显示键名本身
