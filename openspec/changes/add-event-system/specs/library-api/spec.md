## ADDED Requirements

### Requirement: Event Subscription

系统必须（MUST）提供事件订阅机制，允许外部消费者监听编辑器内部状态变化。

#### Scenario: 订阅代码变更事件

- **WHEN** 用户调用 `editor.on('codeChange', handler)`
- **AND** 画布或代码面板触发代码变更
- **THEN** `handler` 被调用，payload 包含 `{ code: string, source: 'canvas' | 'code' | 'external' }`

#### Scenario: 订阅选择变更事件

- **WHEN** 用户调用 `editor.on('selectionChange', handler)`
- **AND** 用户在画布上选择节点
- **THEN** `handler` 被调用，payload 包含 `{ nodeIds: string[] }`

#### Scenario: 订阅节点添加事件

- **WHEN** 用户调用 `editor.on('nodeAdd', handler)`
- **AND** 用户通过画布或代码添加节点
- **THEN** `handler` 被调用，payload 包含完整的 `NodeData`

### Requirement: Event Unsubscription

系统必须（MUST）提供事件取消订阅机制，防止内存泄漏。

#### Scenario: 取消事件订阅

- **WHEN** 用户调用 `editor.off('codeChange', handler)`
- **AND** 后续触发代码变更
- **THEN** `handler` 不再被调用

#### Scenario: 一次性事件监听

- **WHEN** 用户调用 `editor.once('ready', handler)`
- **AND** 编辑器完成初始化
- **THEN** `handler` 被调用一次
- **AND** 后续不再被调用

### Requirement: Type-Safe Event API

系统必须（MUST）提供类型安全的事件 API，在编译时检查事件名称和 payload 类型。

#### Scenario: TypeScript 类型检查

- **WHEN** 开发者使用 TypeScript 编写 `editor.on('codeChange', (payload) => {})`
- **THEN** `payload` 自动推断为 `{ code: string, source: CodeChangeSource }`
- **AND** 错误的事件名称导致编译错误
