---
title: vxe 列表列配置持久化
module: 共享能力
author: auto-doc-sync
last_updated: 2026-08-02
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
  "visibleColumnKeys": ["type:checkbox", "field:orderNo", "field:clientName"],
  "columnVisibility": { "field:orderNo": true },
  "columnFixed": { "field:orderNo": "left" },
  "columnWidths": { "field:clientName": 240 },
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

### 列键规则（2026-08-02 起）

列键由 `buildColumnIdentityKey` 生成，**不含列下标**：优先 `field:<字段名>`，无 `field` 时依次退到 `type:<类型>` / `title:<标题>` / `index:<下标>`；同名列按出现次序追加 `#1`、`#2`。

旧格式 `col_<下标>_<字段名>` 保留在列对象的 `_columnLegacyKey` 上，**仅用于读取存量配置**；保存一律写新键，用户下次调整列时自动完成迁移。

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

> [!IMPORTANT] **配置认不出的列必须回退默认可见** `applyColumnConfig` 里，配置中找不到对应键的列一律按 `_columnDefaultVisible` 回退，绝不能落回「不在 `visibleColumnKeys` 里就隐藏」的兼容分支——那条分支曾导致列定义一改动就整片列消失。兼容分支（`useVisibleKeysAsCompactVisibility`）只对确实命中配置的列生效。应用完成后还有一道兜底：全部列都被判隐藏时整体回退默认，默认也全隐藏则强制全部可见。

> [!IMPORTANT] **脏配置自愈要覆盖本地兜底** 远端与本地兜底（`draggable_table_config_*` / `fallback_table_config_*`）两条加载路径都要走 `applyColumnConfig` 返回的 `invalid` 判断，命中即 `healColumnConfig` 用当前默认列覆盖远端并清本地缓存；远端已自愈时用 `hasHealed` 跳过本地兜底，避免刚修好又被盖回去。

> [!IMPORTANT] **tableId 缺省会撞车** 未显式配置 `columnPersist.tableId` / `gridOptions.id` 时回退成路由名，同一路由上的两张不同列表会共用一份配置。多表页面必须显式给 `gridOptions.id`。

> [!IMPORTANT] **columns 引用稳定化** `options` 计算属性用 `getBoundColumnsSignature`（`field/title/type/visible/fixed/width`）判断列定义是否变化：签名不变时复用同一 `columns` 数组引用，避免与列无关的响应式重算（如工具栏插槽读取分组 Tab 的 loading/items）改变 `columns` 引用触发 vxe `reloadColumn`，从而冲掉用户运行时的显隐/顺序/列宽。若新增会影响列渲染但未纳入签名的字段，需同步扩充签名。

# 6. 变更与解析日志 (Changelog & Insights)

| 日期 | 变更类型 | 📝 业务功能变动 | 🤖 代码解析与架构洞察 |
| :-- | :-- | :-- | :-- |
| 2026-08-02 | Fix | 列定义调整、旧格式或异种配置不再导致表格列大面积（甚至全部）消失 | 三处改动：①列键改为与下标无关的 `field:xxx`，旧键留在 `_columnLegacyKey` 供读取存量配置；②`applyColumnConfig` 中配置认不出的列回退默认可见，并加「应用后无可见列」兜底，返回 `invalid`/`recovered`；③抽出 `healColumnConfig`，远端与本地兜底共用自愈判断，`hasHealed` 防止自愈后被本地配置盖回。见 `change-log-2026-08-02-vxe-column-persist-hide-all-guard.md` |
| 2026-07-12 | Fix | 工具栏等与列无关的重算不再重置用户列设置（显隐/顺序/列宽） | 根因：`toolbarOptions` 调用插槽渲染读取分组 Tab 响应式状态 → `options` 重算生成新 `columns` 引用 → vxe `reloadColumn`。修复：`getBoundColumnsSignature` 稳定 `columns` 引用，签名变化才下发 |
| 2026-07-12 | Style | vxe-grid 全局选中行（checkbox/radio/current）背景改为主题色 15% 透明 | 变量定义于 `packages/effects/plugins/src/vxe-table/style.css` `:root .vxe-grid`；与 antd Table 全局规则（`packages/styles/src/antd/index.css`）并列维护 |
| 2026-07-05 | Feature | 列配置保存附带 `_debug` 排查快照，拦截保存时写入 localStorage | trigger/keyMapping/totals 便于对照 UserSetting 还原保存现场 |
| 2026-07-05 | Fix | 列显隐持久化改为 getFullColumns 采集真实显隐，孪生费用表独立 tableId | vxe 4.17 getColumns 仅含 visibleColumn，原保存逻辑会把隐藏列误写 false |
| 2026-06-27 | Fix | 列宽拖拽与持久化回填不再受 `minWidth` 限制 | 列初始化时将 `minWidth` 转为初始 `width` 并移除；全局 `resizableConfig.minWidth: 0` |
| 2026-06-27 | Fix | 修复列宽拖拽后刷新不生效 | vxe 默认 `resizeWidth: 0` 阻断 `renderWidth` 回退，基线采集与稀疏保存均失败 |
| 2026-06-27 | Feature | 列宽拖拽调整纳入列配置持久化，与显隐/顺序/固定共用一条 UserSetting | `columnResizableChange` 触发防抖保存；`columnWidths` 稀疏存储；无默认 width 列在加载后采 renderWidth 基线 |
| 2026-05-29 | Feature/Fix | 列配置读取改为登录后全局预拉取 + 缓存 | `columnPersist.load/add/edit/remove` 走全局 store |
| 2026-05-10 | Feature | 列显隐与顺序持久化上线 | `use-vxe-grid.vue` 统一 load/save/reset 流程 |
