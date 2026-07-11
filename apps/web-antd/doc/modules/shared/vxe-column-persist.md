---
title: vxe 列表列配置持久化
module: 共享能力
author: auto-doc-sync
last_updated: 2026-07-12
---

# 1. 业务背景说明 (Background)

**白话解释：** 全站使用 `useVbenVxeGrid` 且开启列自定义工具栏的列表，会按「当前用户 + 表格 tableId」记住列显隐、顺序、固定与列宽。刷新页面或重新登录后自动恢复，无需每个业务页单独实现。

# 2. 功能与操作说明 (Features & Operations)

- **列显隐/顺序/固定：** 通过工具栏列设置面板调整，关闭面板或拖拽列头后自动保存。
- **列宽：** 拖拽列头分隔线调整宽度，松手后自动保存（120ms 防抖）。
- **恢复默认：** 工具栏「恢复默认」会同时重置显隐、顺序、固定与列宽。
- **未开持久化：** 仍可拖宽列宽，但刷新后恢复代码默认宽度。

# 3. 配置协议

存储键：`table_config_${tableId}`（`UserSetting` 接口）

```json
{
  "visibleColumnKeys": ["col_0_orderNo", "col_1_clientName"],
  "columnVisibility": { "col_0_orderNo": true },
  "columnFixed": { "col_0_orderNo": "left" },
  "columnWidths": { "col_1_clientName": 240 },
  "_debug": {
    "savedAt": "2026-07-05T12:00:00.000Z",
    "tableId": "sea-export-order-fee-0",
    "userSettingKey": "table_config_sea-export-order-fee-0",
    "trigger": "customChange",
    "totals": {
      "stableColumnCount": 26,
      "getColumnsCount": 20,
      "getFullColumnsCount": 26,
      "visibleInConfig": 20,
      "hiddenInConfig": 6
    },
    "keyMapping": {
      "fullColumnsSignatureMatched": 26,
      "fullColumnsColumnKeyMatched": 0,
      "fullColumnsFallbackMatched": 0,
      "visibleKeysNotInStableColumns": 0
    },
    "flags": {
      "suspicious": false,
      "isApplyingColumnConfig": false,
      "initializedColumns": true
    }
  }
}
```

| 字段                | 说明                                   |
| :------------------ | :------------------------------------- |
| `visibleColumnKeys` | 可见列顺序                             |
| `columnVisibility`  | 列显隐                                 |
| `columnFixed`       | 列固定 left/right                      |
| `columnWidths`      | 稀疏列宽，仅存有意义的用户调整         |
| `_debug`            | 每次保存附带的排查快照（不影响列回放） |

### `_debug` 排查说明

- **每次成功保存**都会写入 `_debug`（随 UserSetting 一起存后端）。
- **`trigger`**：保存触发来源（`custom` / `customChange` / `columnDropEnd` / `columnResizableChange` / `heal`）。
- **`keyMapping.fullColumnsFallbackMatched > 0`**：列 key 映射失败，重点怀疑字段/标题变更或 vxe 运行时列信息异常。
- **`totals.getColumnsCount` 远小于 `totals.stableColumnCount`**：保存时可见列偏少，对照 `visibleInConfig` 看是否只剩 checkbox。
- **保存被拦截**（疑似残缺配置）：不会写远端，快照落在 `localStorage['fallback_debug_table_config_${tableId}']`。
- **更详细快照**：`localStorage.setItem('__debug_vxe_persist', '1')` 后，`_debug.verbose` 会附带各列摘要与 `visibilityMismatch`。

# 4. 生效条件

- `columnPersist.enabled === true`，或未显式关闭且 `toolbarConfig.custom === true`
- 需有稳定 `tableId`（`columnPersist.tableId` / `gridOptions.id` / 路由兜底）

# 5. 核心业务卡点 (Business Blockers)

> [!IMPORTANT] **动态换列页面** 运行时通过 `setGridOptions({ columns })` 整体换列时，v1 不会自动套用已保存列宽；用户需在新列集上重新拖拽。

# 6. 变更与解析日志 (Changelog & Insights)

| 日期 | 变更类型 | 📝 业务功能变动 | 🤖 代码解析与架构洞察 |
| :-- | :-- | :-- | :-- |
| 2026-07-12 | Style | vxe-grid 全局选中行（checkbox/radio/current）背景改为主题色 15% 透明 | 变量定义于 `packages/effects/plugins/src/vxe-table/style.css` `:root .vxe-grid`；与 antd Table 全局规则（`packages/styles/src/antd/index.css`）并列维护 |
| 2026-07-05 | Feature | 列配置保存附带 `_debug` 排查快照，拦截保存时写入 localStorage | trigger/keyMapping/totals 便于对照 UserSetting 还原保存现场 |
| 2026-07-05 | Fix | 列显隐持久化改为 getFullColumns 采集真实显隐，孪生费用表独立 tableId | vxe 4.17 getColumns 仅含 visibleColumn，原保存逻辑会把隐藏列误写 false |
| 2026-06-27 | Fix | 列宽拖拽与持久化回填不再受 `minWidth` 限制 | 列初始化时将 `minWidth` 转为初始 `width` 并移除；全局 `resizableConfig.minWidth: 0` |
| 2026-06-27 | Fix | 修复列宽拖拽后刷新不生效 | vxe 默认 `resizeWidth: 0` 阻断 `renderWidth` 回退，基线采集与稀疏保存均失败 |
| 2026-06-27 | Feature | 列宽拖拽调整纳入列配置持久化，与显隐/顺序/固定共用一条 UserSetting | `columnResizableChange` 触发防抖保存；`columnWidths` 稀疏存储；无默认 width 列在加载后采 renderWidth 基线 |
| 2026-05-29 | Feature/Fix | 列配置读取改为登录后全局预拉取 + 缓存 | `columnPersist.load/add/edit/remove` 走全局 store |
| 2026-05-10 | Feature | 列显隐与顺序持久化上线 | `use-vxe-grid.vue` 统一 load/save/reset 流程 |
