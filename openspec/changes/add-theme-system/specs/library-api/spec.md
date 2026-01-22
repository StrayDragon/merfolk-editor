## ADDED Requirements

### Requirement: Theme Preset Support

系统必须（MUST）支持预设主题切换。

#### Scenario: 切换到暗色主题

- **WHEN** 用户调用 `editor.setTheme('dark')`
- **THEN** 编辑器背景变为暗色
- **AND** 文本颜色变为浅色
- **AND** 节点和边样式相应调整

#### Scenario: 切换到亮色主题

- **WHEN** 用户调用 `editor.setTheme('light')`
- **THEN** 编辑器背景变为浅色
- **AND** 文本颜色变为深色

#### Scenario: 自动跟随系统主题

- **WHEN** 用户调用 `editor.setTheme('auto')`
- **AND** 系统偏好为暗色模式
- **THEN** 编辑器应用暗色主题
- **WHEN** 系统偏好变更为亮色模式
- **THEN** 编辑器自动切换为亮色主题

### Requirement: Custom Theme Support

系统必须（MUST）支持自定义主题配置。

#### Scenario: 应用自定义主题

- **WHEN** 用户调用 `editor.setTheme({ colors: { bgPrimary: '#1a1a2e', accentColor: '#e94560' } })`
- **THEN** 编辑器应用自定义颜色
- **AND** 未指定的颜色使用默认值

#### Scenario: 通过初始化选项设置主题

- **WHEN** 用户创建编辑器 `new MerfolkEditor(container, { theme: 'dark' })`
- **THEN** 编辑器以暗色主题初始化

### Requirement: CSS Variable Integration

系统必须（MUST）通过 CSS 变量实现主题，允许外部样式覆盖。

#### Scenario: 外部 CSS 覆盖

- **WHEN** 宿主页面定义 `.merfolk-editor { --merfolk-bg-primary: #custom; }`
- **THEN** 编辑器使用自定义背景色
- **AND** 优先级高于 JS 设置的主题

### Requirement: Theme Change Event

系统应该（SHOULD）在主题变更时触发事件。

#### Scenario: 监听主题变更

- **WHEN** 用户调用 `editor.on('themeChange', handler)`
- **AND** 主题被切换
- **THEN** `handler` 被调用，payload 包含 `{ theme: 'dark' | 'light', isAuto: boolean }`
