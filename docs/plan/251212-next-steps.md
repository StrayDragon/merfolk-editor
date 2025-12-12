# Merfolk Editor - 下一步开发计划

> 创建日期: 2025-12-12
> MVP 状态: ✅ 已完成

## 当前完成状态

### Phase 1: 核心模型 ✅
- [x] 数据模型 (FlowchartModel, FlowNode, FlowEdge, FlowSubGraph)
- [x] Mermaid 解析器 (MermaidParser)
- [x] 序列化器 (MermaidSerializer)

### Phase 2: 画布渲染 ✅
- [x] D3.js 画布 (缩放、平移)
- [x] 形状渲染 (9种: rect, rounded, circle, diamond, stadium, cylinder, hexagon, subroutine, odd)
- [x] 边渲染 (箭头、标签、动画)
- [x] Dagre 自动布局

### Phase 3: 基础 UI ✅
- [x] Svelte 组件 (Editor, Canvas, CodePanel, Toolbar)
- [x] 双向同步 (代码 ↔ 画布)
- [x] 基础工具栏 (缩放、适应视图、代码面板切换)

---

## 待完成功能

### Phase 4: 交互编辑 (优先级: 高)

#### 4.1 选择功能
- [ ] 单击选择节点/边
- [ ] Shift+单击多选
- [ ] 框选 (拖拽矩形选择区域)
- [ ] 选中状态视觉反馈 (高亮边框)
- [ ] 快捷键: Ctrl+A 全选, Escape 取消选择

#### 4.2 节点拖拽
- [ ] 拖拽移动单个节点
- [ ] 拖拽移动多个选中节点
- [ ] 拖拽时实时更新连线
- [ ] 拖拽结束后更新模型和代码

#### 4.3 连线创建
- [ ] 从节点边缘拖出创建新连线
- [ ] 连线时显示可连接的目标节点
- [ ] 连线完成后弹出边属性编辑

#### 4.4 节点编辑
- [ ] 双击节点进入文本编辑模式
- [ ] 编辑完成后更新模型
- [ ] 支持多行文本

### Phase 5: 属性面板 (优先级: 高)

#### 5.1 节点属性
- [ ] 文本编辑
- [ ] 形状选择 (下拉菜单)
- [ ] 样式编辑 (填充色、边框色、文字色)
- [ ] 链接设置 (URL、打开方式)

#### 5.2 边属性
- [ ] 标签文本
- [ ] 线条类型 (实线、虚线、粗线)
- [ ] 箭头类型 (箭头、圆形、叉号、无)
- [ ] 动画开关

#### 5.3 图表属性
- [ ] 方向切换 (TB/BT/LR/RL)
- [ ] 布局参数 (节点间距、层级间距)

### Phase 6: Monaco Editor 集成 (优先级: 中)

#### 6.1 基础集成
- [ ] 替换 textarea 为 Monaco Editor
- [ ] Mermaid 语法高亮
- [ ] 基础自动补全

#### 6.2 高级功能
- [ ] 错误标记 (红色波浪线)
- [ ] 悬停提示
- [ ] 代码折叠
- [ ] 格式化

### Phase 7: 撤销/重做 (优先级: 中)

#### 7.1 命令模式
- [ ] Command 基类
- [ ] AddNodeCommand
- [ ] DeleteNodeCommand
- [ ] MoveNodeCommand
- [ ] AddEdgeCommand
- [ ] UpdatePropertyCommand
- [ ] BatchCommand (合并多个操作)

#### 7.2 历史管理
- [ ] HistoryManager (撤销/重做栈)
- [ ] 快捷键: Ctrl+Z 撤销, Ctrl+Shift+Z 重做
- [ ] 工具栏按钮

### Phase 8: 形状面板 (优先级: 中)

- [ ] 侧边栏形状列表
- [ ] 拖拽添加节点到画布
- [ ] 形状预览
- [ ] 分类展示

### Phase 9: VSCode 扩展 (优先级: 低)

#### 9.1 扩展基础
- [ ] 创建 extension/ 目录
- [ ] CustomTextEditorProvider 实现
- [ ] Webview 通信桥

#### 9.2 功能集成
- [ ] 打开 .mmd 文件时启动编辑器
- [ ] 文件保存同步
- [ ] 主题跟随 VSCode

### Phase 10: 高级功能 (优先级: 低)

#### 10.1 子图支持
- [ ] 子图渲染 (带边框的容器)
- [ ] 子图折叠/展开
- [ ] 拖拽节点进出子图

#### 10.2 导出功能
- [ ] 导出为 SVG
- [ ] 导出为 PNG
- [ ] 复制 Mermaid 代码

#### 10.3 其他图表类型扩展
- [ ] 设计 DiagramPlugin 接口
- [ ] Sequence Diagram 支持
- [ ] Class Diagram 支持

---

## 技术债务

- [ ] 单元测试 (core 模块)
- [ ] E2E 测试 (Playwright)
- [ ] 性能优化 (大图渲染)
- [ ] 无障碍支持 (ARIA)
- [ ] 国际化 (i18n)

---

## 建议开发顺序

1. **Phase 4.1-4.2**: 选择和拖拽 - 这是编辑器的核心交互
2. **Phase 5**: 属性面板 - 让用户能修改节点/边属性
3. **Phase 7**: 撤销/重做 - 编辑器必备功能
4. **Phase 4.3**: 连线创建 - 完善图表编辑能力
5. **Phase 6**: Monaco Editor - 提升代码编辑体验
6. **Phase 8**: 形状面板 - 更直观的添加节点方式
7. **Phase 9**: VSCode 扩展 - 集成到开发环境
8. **Phase 10**: 高级功能 - 按需添加
