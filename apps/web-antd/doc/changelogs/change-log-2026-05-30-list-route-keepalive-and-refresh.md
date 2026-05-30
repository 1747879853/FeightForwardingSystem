# 列表路由 keepAlive 缓存与刷新策略统一

## 背景意图

业务列表页在菜单间频繁切换时，用户希望保留筛选条件、分页位置与已加载数据，减少重复请求与操作成本。项目基于 Vben Admin 的标签栏 + `KeepAlive` 机制，通过路由 `meta.keepAlive: true` 开启页面级缓存。

此前仅部分页面未配置缓存；配置缓存后，若缺少「修改后刷新」或「从表单页返回刷新」逻辑，列表会展示过期数据。本次统一为各业务列表路由开启缓存，并校验、补齐增删改后的刷新链路。

## 核心逻辑变更

### 1. 路由层：列表页统一 `meta.keepAlive: true`

| 模块 | 路由名称（节选） |
| :-- | :-- |
| 基础资料 | `BasicData` 及 18 个子列表（carrier、fee-code、se-service-config 等） |
| 客户 | `ClientList` |
| 海运出口/进口 | `SeaExportList`、`SeaImportList` |
| 运价 | `FreightRateList` |
| 费用管理 | `SeaExportFeeLockList`、`PaymentApplicationList`、`StatementList` |
| 审核审批 | `ExpenseAll`、`PaymentReview` |
| 结算管理 | `PaymentSettlementList` |
| 系统管理 | `SystemUser`、`SystemRole`、`SystemPermission`、`SystemDept`、`SystemWorkflow`、`SystemEnumeration` |

**未缓存**：各模块的 create/edit 表单页、详情页、404 等，避免编辑态被错误保留。

### 2. 列表页刷新策略（两类）

**A. 弹窗型列表（当前页 CRUD）**

- 删除成功 → `handleRefresh()` / `gridApi.query()`
- 弹窗保存成功 → `@success="handleRefresh"`
- 典型：基础资料 18 个列表、用户/角色/部门/枚举、运价列表

**B. 独立表单页列表（跳转 create/edit）**

- 除 A 类逻辑外，增加 `onActivated(() => handleRefresh())`
- 从表单页返回或切换标签再进入时自动重新拉取
- 涉及：`client/list.vue`、`sea-export-admin/list.vue`、`sea-import-admin/list.vue`、`system/workflow/list.vue`、`payment-application/list.vue`、`statement/index.vue`、`payment-settlement/list.vue`

### 3. 额外修复

| 页面 | 修复内容 |
| :-- | :-- |
| `system/user/list.vue` | 启用/禁用、还原权限成功后调用 `onRefresh()` |
| `system/role/list.vue` | 默认角色切换成功后调用 `onRefresh()` |
| `payment-settlement/list.vue` | 编辑按钮由 TODO 改为跳转 `/settlement-management/payment-settlement/:id/edit` |

## 避坑指南

1. **keepAlive 生效前提**：需同时满足路由 `meta.keepAlive: true` 与全局偏好 `tabbar.enable && tabbar.keepAlive`（见 `packages/effects/layouts/src/basic/content/content.vue`）。
2. **组件 name 对齐**：Layout 会将路由 `name` 写入组件 `name`，供 `KeepAlive include` 匹配；路由 `name` 勿随意改动。
3. **弹窗列表不必 onActivated**：在当前页弹窗完成 CRUD 时，`@success` 已足够；仅「跳转到独立表单页」的列表需要 `onActivated`。
4. **首次进入可能双请求**：`onActivated` 在 keep-alive 组件首次挂载时也会触发，可能与 grid 初始 `autoLoad` 各请求一次，属可接受范围；若需优化可加「跳过首次激活」标志。
5. **跨用户/跨窗口不同步**：缓存仅当前浏览器标签会话有效，他人修改数据需手动点工具栏刷新或关闭标签重开。

## 相关文档

- 开发指南：[列表页 keepAlive 与刷新约定](../guides/list-page-keepalive-refresh.md)
