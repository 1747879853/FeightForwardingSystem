# 2026-08-02 修复列持久化可能导致表格列大面积消失

## 背景意图

排查 `/audit-approval/expense-review` 三张表格的列持久化时发现：`use-vxe-grid.vue` 的列配置回放存在「把认不出的列一律隐藏」的分支，一旦保存过的列键与当前列对不上，用户会看到表格几乎（甚至完全）没有列，且脏配置会长期留在 `UserSetting` 里，每次进页面都复现。

触发这一状态并不需要极端条件，常见诱因有三类：

1. 列键是 `col_${下标}_${字段名}`，在 columns 数组中间插入/删除一列，其后所有列的键整体平移。
2. 保存的配置里所有列都可见（用户只拖过列宽或打开过列设置面板就会存成这样），此时命中兼容分支 `useVisibleKeysAsCompactVisibility`，凡是键对不上的列全部判为隐藏。
3. 自愈只在「一个键都对不上」时才触发，上述「前几列还能对上、后面全平移」的部分失配落在自愈盲区。

另外本地兜底（`draggable_table_config_*` / `fallback_table_config_*`）这条加载路径完全没有校验，旧格式或异种配置会被原样应用，还会回写远端。

## 核心逻辑变更

均在 `packages/effects/plugins/src/vxe-table/use-vxe-grid.vue`。

### 1. 列键去掉下标依赖，并保留旧键兼容

`normalizeColumns` 新增 `buildColumnIdentityKey`：优先 `field:<字段名>`，无 field 时依次退到 `type:<类型>` / `title:<标题>` / `index:<下标>`，同名按出现次数加 `#n` 后缀去重。生成的新键同时写入 `_columnUniqueKey` 与 `column.id`。

旧的 `col_${下标}_${字段名}` 保留在 `_columnLegacyKey`，仅用于读取存量配置，保存时一律写新键——即存量配置会在用户下一次调整列时平滑迁移到新格式，不会因为改键而丢设置。

### 2. 认不出的列回退默认可见，而不是隐藏

`applyColumnConfig` 用 `resolveConfigKey` 依次拿新键、旧键去配置里找；找不到的列走 `applyDefaultVisual`（按 `_columnDefaultVisible` / `_columnDefaultFixed` 回退），不再落到 `visibleKeySet.has(key)` 被判为 false。兼容分支只对确实命中配置的列生效。

同时新增最终兜底：应用后若所有列都是隐藏，则整体回退默认；默认也全隐藏时强制全部可见。

`applyColumnConfig` 返回值新增 `invalid` 与 `recovered`，供调用方判断是否需要自愈。

### 3. 自愈统一，本地兜底路径同样校验

抽出 `healColumnConfig(columns, { reason, sourceConfig })`：用当前（已回退为默认的）列重建配置并覆盖远端，避免脏配置反复生效。

- 远端配置 `invalid` 时：清本地缓存 + 自愈，并用 `hasHealed` 标记跳过本地兜底，防止刚自愈完又被同样可疑的本地配置盖回去。
- 本地兜底配置 `invalid` 时：不再原样应用后回写远端，改为清缓存 + 自愈。

## 避坑指南

- **列键含义已变**：`visibleColumnKeys` / `columnVisibility` 里的键从 `col_0_orderNo` 变成 `field:orderNo`（无 field 的列是 `type:checkbox` 这类）。排查线上配置时注意两种格式都可能存在。
- **同 field 重复列**：两列 `field` 相同会被拆成 `field:xxx` 与 `field:xxx#1`，顺序敏感——如果后续把这两列前后调换，两者的配置会互换。列定义里应尽量避免重复 field。
- **新增列的位置**：配置里没有的列仍然排在「已保存可见列」之后（表格最右），不会插回代码里定义的位置，用户可通过列设置面板拖回去。
- **仍未处理的隐患**：`tableId` 缺省会回退成路由名（仓库里绝大多数表未显式写 `gridOptions.id`），同一路由上出现两张列不同的表会共用一份配置；本地兜底走 localStorage，不区分登录用户。这两点本次未改，多表页面请显式给 `gridOptions.id`。
