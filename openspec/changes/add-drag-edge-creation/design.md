## Context

当前边创建流程：
1. 右键点击源节点
2. 选择"添加连接"
3. 在对话框中选择目标节点
4. 配置边属性
5. 点击确认

这个流程步骤多、不直观，与主流图编辑器（Draw.io、Excalidraw、Figma）的拖拽式体验差距明显。

现有代码基础：
- `src/canvas/ports/PortManager.ts` - 已有端口位置计算
- `src/canvas/ports/EdgeCreationState.ts` - 已有部分状态管理
- `src/canvas/drag/DragEdgeState.ts` - 已有边拖拽状态

## Goals / Non-Goals

**Goals:**
- 从节点端口拖拽创建边
- 实时显示临时连线
- 悬停目标节点高亮
- Escape 取消

**Non-Goals:**
- 边的重连（拖拽修改边的端点）
- 多边同时创建
- 曲线路径自定义

## Decisions

### Decision 1: 端口显示策略

**内容**: 仅在以下情况显示端口：
1. 鼠标悬停节点时显示该节点的端口
2. 拖拽中显示源节点和悬停目标节点的端口

**原因**: 减少视觉干扰，只在需要时显示

**Alternatives considered**:
- 始终显示所有端口：视觉杂乱
- 仅显示最近的端口：实现复杂

### Decision 2: 端口位置

**内容**: 每个节点 4 个端口（上、右、下、左），位于边框中点

```
       ●
    ┌──┴──┐
  ● │     │ ●
    └──┬──┘
       ●
```

**原因**: 简单明确，覆盖主要方向

### Decision 3: 状态机设计

**内容**: 使用有限状态机管理拖拽流程

```
┌───────┐   mousedown on port   ┌──────────┐
│ idle  │ ─────────────────────▶ │ dragging │
└───────┘                        └────┬─────┘
    ▲                                 │
    │ Escape / mouseup on invalid     │ mouseenter target node
    │◀────────────────────────────────┤
    │                                 ▼
    │                        ┌───────────────────┐
    │ mouseup on target      │ hovering-target   │
    │◀───────────────────────│                   │
    │                        └───────────────────┘
    │
    ▼
┌─────────┐
│ created │ (transition back to idle immediately)
└─────────┘
```

**原因**: 清晰的状态转换，易于测试和调试

### Decision 4: 临时边渲染

**内容**: 使用 SVG path 渲染临时边，样式为虚线

```css
.temp-edge {
  stroke: var(--merfolk-accent-color);
  stroke-width: 2;
  stroke-dasharray: 5 3;
  opacity: 0.7;
}
```

**原因**: 与正式边区分，表明临时状态

## Risks / Trade-offs

| 风险 | 影响 | 缓解措施 |
|------|------|----------|
| 触控设备兼容性 | 移动端无法使用 | 保留对话框方式作为备选 |
| 小屏幕端口难点击 | 误操作 | 端口热区适当放大 |
| 与选择/拖拽冲突 | 误触发 | 仅端口区域触发拖拽 |

## Migration Plan

1. 新增拖拽连线功能
2. 保留右键菜单"添加连接"
3. 用户可选择使用任一方式

## Open Questions

- [ ] 是否需要支持触控设备的长按拖拽？（暂定不支持）
- [ ] 是否在拖拽时显示边属性面板？（暂定不显示，创建后可编辑）
