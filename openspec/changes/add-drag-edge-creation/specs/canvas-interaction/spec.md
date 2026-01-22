## ADDED Requirements

### Requirement: Port Display on Hover

系统必须（MUST）在鼠标悬停节点时显示连接端口。

#### Scenario: 显示端口

- **WHEN** 用户将鼠标移动到节点上
- **THEN** 节点显示 4 个连接端口（上、右、下、左）
- **AND** 端口位于节点边框中点

#### Scenario: 隐藏端口

- **WHEN** 用户将鼠标移出节点
- **AND** 当前未进行拖拽连线
- **THEN** 端口隐藏

### Requirement: Drag Edge Creation

系统必须（MUST）支持从端口拖拽创建边。

#### Scenario: 开始拖拽

- **WHEN** 用户在端口上按下鼠标
- **AND** 开始拖动
- **THEN** 显示从端口到鼠标位置的临时连线
- **AND** 源节点端口保持显示

#### Scenario: 悬停目标节点

- **WHEN** 用户拖拽临时连线到另一个节点
- **THEN** 目标节点高亮
- **AND** 目标节点显示端口

#### Scenario: 完成连线

- **WHEN** 用户在目标节点或其端口上释放鼠标
- **THEN** 创建从源节点到目标节点的边
- **AND** 临时连线消失
- **AND** 新边被选中

#### Scenario: 取消拖拽

- **WHEN** 用户在拖拽过程中按下 Escape 键
- **OR** 用户在无效区域释放鼠标
- **THEN** 临时连线消失
- **AND** 不创建任何边

### Requirement: Edge Creation Validation

系统必须（MUST）验证边创建的有效性。

#### Scenario: 禁止自连接

- **WHEN** 用户尝试从节点拖拽到同一节点
- **THEN** 不创建边
- **AND** 显示禁止光标

#### Scenario: 禁止重复边

- **WHEN** 用户尝试创建已存在的边（相同源和目标）
- **THEN** 不创建重复边
- **AND** 显示禁止光标

### Requirement: Temporary Edge Styling

系统必须（MUST）使用特殊样式渲染临时边以区分正式边。

#### Scenario: 临时边外观

- **WHEN** 用户正在拖拽创建边
- **THEN** 临时边显示为虚线
- **AND** 临时边半透明
- **AND** 临时边使用强调色
