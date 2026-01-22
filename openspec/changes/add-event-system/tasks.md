## 1. 类型定义

- [ ] 1.1 在 `src/lib/types.ts` 定义 `EditorEvent` 联合类型
- [ ] 1.2 定义每种事件的 payload 接口（`CodeChangeEvent`, `SelectionChangeEvent` 等）
- [ ] 1.3 定义 `EventHandler<T>` 泛型类型

## 2. EventEmitter 增强

- [ ] 2.1 审计 `src/core/model/EventEmitter.ts` 现有实现
- [ ] 2.2 添加 `once()` 方法支持
- [ ] 2.3 添加类型安全的泛型重载

## 3. MerfolkEditor 集成

- [ ] 3.1 在 `MerfolkEditor` 类中创建内部 `EventEmitter` 实例
- [ ] 3.2 实现 `on()`, `off()`, `once()` 公开方法
- [ ] 3.3 从 `SyncEngine` 订阅事件并转发
- [ ] 3.4 从 `FlowchartModel` 订阅事件并转发

## 4. 测试

- [ ] 4.1 单元测试：事件订阅/取消订阅
- [ ] 4.2 单元测试：`once()` 只触发一次
- [ ] 4.3 单元测试：事件 payload 正确性
- [ ] 4.4 单元测试：内存泄漏检测（`off()` 后无残留引用）

## 5. 文档

- [ ] 5.1 更新 README 添加事件 API 示例
- [ ] 5.2 为所有公开事件方法添加 JSDoc 注释
