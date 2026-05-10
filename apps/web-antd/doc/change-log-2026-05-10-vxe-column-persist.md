# useVbenVxeGrid 列设置持久化改造归档

## 基本信息

- 日期：2026-05-10
- 范围：`web-antd` 列表全局组件（`useVbenVxeGrid`）列显隐/顺序配置持久化
- 目标：将列设置从仅前端临时状态升级为“按用户 + 按表格”持久化存储

## 改动文件

- 新增：`apps/web-antd/src/api/system/user-setting-admin.ts`
- 修改：`apps/web-antd/src/adapter/vxe-table.ts`
- 修改：`packages/effects/plugins/src/vxe-table/types.ts`
- 修改：`packages/effects/plugins/src/vxe-table/use-vxe-grid.vue`

## 变更摘要

### 1. 新增用户设置接口封装

- 在 `user-setting-admin.ts` 新增 `UserSettingAdmin` 五个接口封装：
  - `getUserSettingPagedList`（GetPagedListAsync）
  - `getUserSettingDetail`（DetailAsync）
  - `addUserSetting`（AddAsync）
  - `editUserSetting`（EditAsync）
  - `deleteUserSetting`（DeleteAsync）
- 对齐 ABP + `requestClient` 既有风格，支持列配置 CRUD。

### 2. 扩展 Grid 类型能力

- 在 `types.ts` 增加 `columnPersist` 配置能力（`VxeGridProps`）：
  - `enabled`
  - `tableId`
  - `load/add/edit/remove`
  - `onError`
- 允许持久化逻辑在全局适配层注入，插件层保持通用。

### 3. 全局列配置持久化主流程接入

- 在 `use-vxe-grid.vue` 增加列设置初始化/保存/重置流程：
  - 初始化：优先后端读取，未命中再读本地缓存并迁移。
  - 保存：有 `userSettingId` 用 `EditAsync`，否则 `AddAsync` 并回填 id。
  - 重置：删除后端记录 + 清理本地缓存 + 恢复默认列。
- 新增列配置协议实现：
  - `setting.name = table_config_${tableId}`
  - `setting = { visibleColumnKeys, columnVisibility }`（JSON 字符串）

### 4. 事件触发与降级兜底

- 接入保存触发事件：
  - `custom`
  - `customChange`
  - `columnDropEnd`
- 接入重置事件：
  - `customReset`
- 后端保存失败时，降级写入：
  - `fallback_table_config_${tableId}`
  - 兼容 `fallback_${userSettingKey}`

### 5. tableId 与用户隔离策略

- `tableId` 采用 hybrid 规则（全局统一）：
  - 优先 `columnPersist.tableId`
  - 其次 `gridOptions.id`
  - 最后 `route.name/route.path` 兜底
- 查询时带 `CreatorUserId`（来自当前登录用户），实现“同页面不同用户配置隔离”。

## 兼容与容错策略

- 列 key 采用稳定规则：`col_${index}_${field || title || type}`。
- 应用配置时先处理显隐，再处理顺序。
- 对已失效列 key 自动过滤。
- 对新增但配置中不存在的可见列自动追加到末尾，避免版本迭代后错乱。
- 支持旧本地 key 迁移：
  - 读取 `draggable_table_config_${tableId}`
  - 命中后写回后端并清理旧 key

## 验证记录

- 已执行类型检查（`vue-tsc --noEmit`）验证改动影响。
- 仓库存在历史遗留 TS 报错，但本次变更文件未新增编译错误。

## 注意事项

- 若业务页面需要更稳定区分同路由多实例表格，建议显式传 `gridOptions.id` 或 `columnPersist.tableId`。
- 当前为全局接入，凡使用 `useVbenVxeGrid` 且开启 `toolbarConfig.custom` 的页面默认生效。
