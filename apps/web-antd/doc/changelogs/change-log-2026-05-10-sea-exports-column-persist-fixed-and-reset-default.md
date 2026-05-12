# sea-exports 列冻结持久化与恢复默认修复

## 背景意图

- 用户反馈两个问题：
  1. 列“冻结在左侧/右侧”状态刷新后丢失；
  2. 点击“恢复默认配置”应回到页面最初传入的列设置。

## 核心技术决策 / 逻辑变更

- 修改文件：`packages/effects/plugins/src/vxe-table/use-vxe-grid.vue`
- 扩展持久化协议，新增 `columnFixed`：
  - 结构：`Record<columnKey, '' | 'left' | 'right'>`
  - 保存时与 `visibleColumnKeys`、`columnVisibility` 一起写入。
- 应用配置时同时恢复冻结状态：
  - 若远端存在 `columnFixed`，按配置回放 `fixed`；
  - 若某列未配置冻结值，则回退到该列默认冻结状态（初始列快照）。
- 归一化阶段记录默认冻结状态：
  - 为每列记录 `_columnDefaultFixed`，用于“恢复默认”和配置缺省回退。

## 恢复默认保证

- `customReset` 流程继续以 `originalColumns`（首次加载时的初始列快照）作为恢复来源。
- 该快照已包含默认顺序、默认显隐与默认冻结方向，确保恢复后与初始传入列配置一致。

## 避坑指南（Gotchas & Constraints）

- 仅持久化显隐和顺序不足以还原用户布局，冻结方向必须作为独立维度存储。
- 旧配置没有 `columnFixed` 时会自动按默认冻结回退，不会破坏兼容性。
