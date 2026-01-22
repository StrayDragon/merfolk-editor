## ADDED Requirements

### Requirement: E2E Test Coverage for Node Operations

系统必须（MUST）提供 E2E 测试覆盖所有节点操作。

#### Scenario: 添加节点

- **WHEN** 用户在画布空白区域右键点击
- **AND** 选择"添加节点 > 矩形"
- **THEN** 画布上显示新节点
- **AND** 代码面板更新显示新节点定义

#### Scenario: 编辑节点

- **WHEN** 用户双击节点
- **AND** 在弹出的对话框中修改文本
- **AND** 点击确认
- **THEN** 节点显示新文本
- **AND** 代码面板同步更新

#### Scenario: 删除节点

- **WHEN** 用户选中节点
- **AND** 按下 Delete 键
- **THEN** 节点从画布移除
- **AND** 代码面板同步更新

### Requirement: E2E Test Coverage for Edge Operations

系统必须（MUST）提供 E2E 测试覆盖所有边操作。

#### Scenario: 添加边

- **WHEN** 用户在节点上右键点击
- **AND** 选择"添加连接"
- **AND** 在对话框中选择目标节点
- **AND** 点击确认
- **THEN** 画布上显示新边
- **AND** 代码面板更新显示新边定义

#### Scenario: 删除边

- **WHEN** 用户点击边选中
- **AND** 按下 Delete 键
- **THEN** 边从画布移除
- **AND** 代码面板同步更新

### Requirement: E2E Test Coverage for Code Sync

系统必须（MUST）提供 E2E 测试验证双向同步。

#### Scenario: 画布到代码同步

- **WHEN** 用户在画布上添加节点
- **THEN** 代码面板在延迟后显示对应的 Mermaid 代码

#### Scenario: 代码到画布同步

- **WHEN** 用户在代码面板中添加节点定义
- **THEN** 画布在延迟后渲染对应的节点

### Requirement: E2E Test Coverage for Undo/Redo

系统必须（MUST）提供 E2E 测试验证撤销/重做功能。

#### Scenario: 撤销操作

- **WHEN** 用户添加节点
- **AND** 按下 Ctrl+Z
- **THEN** 节点被移除
- **AND** 代码面板恢复到之前状态

#### Scenario: 重做操作

- **WHEN** 用户撤销添加节点操作
- **AND** 按下 Ctrl+Y
- **THEN** 节点重新出现
- **AND** 代码面板恢复到添加后状态
