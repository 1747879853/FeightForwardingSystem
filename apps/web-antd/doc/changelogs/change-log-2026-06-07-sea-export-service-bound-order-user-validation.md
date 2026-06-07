# 海运出口保存时按服务项目校验干系人角色

**日期：** 2026-06-07  
**变更类型：** Feature  
**影响模块：** 海运出口新建/编辑表单

---

## 背景意图

港口服务项配置为每个服务项绑定了责任角色（`userAttribute` 位标志）。保存订单时，若已勾选的服务项在干系人中缺少至少一个绑定角色（或未选人），后续服务任务无法正确分配处理人。

---

## 核心逻辑变更

### 1. API 类型（`sea-export-admin.ts`）

- `ServiceTypeByPolDto` 新增 `userAttribute?: number`，与 `GetServiceTypesByPOLAsync` 最新 OpenAPI 对齐。

### 2. 保存校验（`form.vue`）

| 校验项 | 规则 |
| --- | --- |
| 销售唯一性 | 保留 `validateSalesRoleCount()` |
| 销售/操作必填 | `validateRequiredOrderUserAssignee()`：销售、操作角色行必须存在且已选人 |
| 服务绑定角色 | 新增 `validateServiceBoundOrderUsers()` |

**动态校验规则：**

- 仅针对**当前勾选**的服务项；未勾选任何服务时跳过动态校验。
- 数据来源为缓存的 `latestAvailableServiceTypes`；配置加载中则提示「服务项目配置加载中，请稍后保存」。
- 每个勾选服务解析 `userAttribute`（`parseSeaExportUserAttribute`），要求干系人中**至少一个**绑定角色已选人。
- 销售、操作始终静态必填；商务/客服/单证/海外客服等由服务项绑定动态决定。

**报错文案：**

- 有角色行未选人：`{角色}必须选择人员（{服务名}）`
- 单角色缺行：`请添加{角色}角色（{服务名}）`
- 多角色均缺行：`{服务名}服务缺少责任人员，请添加{角色A}或{角色B}角色`

### 3. 删除保护

- `requiredOrderUserRoles` 保持 `[Sales, Operation]`，销售与操作不可删除。

---

## 避坑指南

1. **按服务项「至少一个」**：一个服务绑多个角色时，干系人具备其中任一角色且已选人即可，不要求全部角色都有。
2. **静态与动态并存**：销售、操作始终必填；动态校验在此基础上叠加服务项绑定角色要求。
3. **缓存未就绪勿放行**：`serviceTypeSyncLoading` 或 `!polServiceConfigLoaded` 时拦截保存，避免用空配置误判。
