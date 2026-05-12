# 搜索字段顺序交互改为拖动排序

## 背景意图

- 搜索字段顺序持久化已可用，但“上移/下移”按钮在字段较多时操作效率较低。
- 需要改为更直观的拖拽排序交互，同时保持顺序持久化与刷新回放能力。

## 核心技术决策 / 逻辑变更

- 在 `packages/effects/plugins/src/vxe-table/use-vxe-grid.vue` 中移除“上移/下移”按钮交互，改为 HTML5 拖拽：
  - `dragstart` 记录源字段；
  - `dragover` 允许放置；
  - `drop` 执行重排并触发保存；
  - `dragend` 清理拖拽状态。
- 保留既有 `fieldOrder` 持久化结构，不改后端数据格式，确保历史配置兼容。
- 拖拽完成后继续复用 `applySearchFieldOrderToSchema` 与节流保存逻辑，保证界面和持久化一致。

## 避坑指南（Gotchas & Constraints）

- 拖拽事件必须显式 `preventDefault`，否则 `drop` 不会触发。
- `drop` 时要处理“拖到自身”的场景，避免无意义写入。
- 顺序交互变化不应影响显隐勾选逻辑，两者需解耦处理。
