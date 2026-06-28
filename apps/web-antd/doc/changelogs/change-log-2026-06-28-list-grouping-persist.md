# 列表分组设置持久化保存

## 背景意图

分组设置（启用的分组字段）此前为页面内临时状态，刷新或重新登录后丢失。需求要求像「搜索项设置」一样持久化保存，下次进入列表自动恢复上次选择的分组维度。

## 核心逻辑变更

### 持久化存储 `store/table-config.ts`

复用 `UserSettingAdmin` 体系，新增与「搜索项配置」对称的一套分组配置读写：

- 关键字前缀 `group_config_`；新增 `groupConfigMap` 缓存与 `groupHasLoaded` 状态。
- 新增 `loadGroupConfigsOnce`、`getGroupConfigByName`、`addGroupConfig`、`editGroupConfig`、`removeGroupConfig`。
- `$reset` 一并重置分组配置状态。

### 登录预热 `store/auth.ts`

登录后批量预热加入 `loadGroupConfigsOnce()`，与 `table_config_`、`search_form_config_` 并行加载。

### 通用分组模块 `components/list-grouping/`

- 新增 `ListGroupingPersist` 接口（`load` / `save`）与 `useListGrouping` 的可选 `persist` 选项。
- 抽出内部 `applyField(value, shouldPersist)`：`enableField` 走持久化，挂载恢复走非持久化（避免无意义写请求）。
- `enableField` / `disable` 在用户切换时调用 `persist.save`。
- 挂载（`onMounted`）时调用 `persist.load` 恢复上次启用的分组字段。

### 海运出口列表 `views/sea-export-admin/list.vue`

注入 `persist`：

- key 为 `group_config_SeaExportList`（与列表 listKey 对齐）。
- `setting` 存 JSON `{ field: number | null }`；启用/关闭分组时 `editGroupConfig`/`addGroupConfig`。
- 恢复时优先用预热缓存，未加载则 `loadGroupConfigsOnce` 兜底。

## 避坑指南

1. **只持久化分组字段**：不持久化选中的分组项（分组项随搜索条件刷新，无持久化意义）。
2. **恢复不写回**：挂载恢复走 `applyField(value, false)`，避免恢复时再触发一次 `EditAsync`。
3. **刷新页面兜底**：`persist.load` 内 `await loadGroupConfigsOnce()`，pinia 不持久化时也能从远端补拉。
4. **后续模块复用**：其他列表接入分组时，传入各自 `group_config_<listKey>` 的 `persist` 即可获得同款持久化能力。
