# 海运出口委托单位改走 Client 失信/干系人摘要接口

## 背景意图

海运出口新建/编辑页选择委托单位后，原先调用 `ClientAdmin/DetailAsync` 拉取业务来源与干系人。普通业务用户可能缺少 `Admin.Client.Get` 权限导致 403。后端已提供登录即可调用的 `Client/GetDishonestStakeholdersAsync`，需前端切换对接。

## 核心逻辑变更

1. **`#/api/common/client`**：新增 `ClientDishonestStakeholderDto` / `CodeSourceSimpleDto` 与 `getClientDishonestStakeholders(id)`。
2. **`form.vue`**：`clientId` 变更联动改为调用新接口；`applyClientCodeSource` 从 `codeSource.id` / `cnName` 写入头部业务来源（含 selectedItems 名称，免二次详情）。
3. **`use-order-users.ts`**：`applyClientDefaultOrderUsers` 入参改为 `ClientDishonestStakeholderDto`；干系人四组字段语义不变。
4. **行为边界**：仍仅新建态回填干系人；编辑态改委托单位只更新业务来源，不覆盖已存干系人。

## 避坑指南

- 勿再为此场景调用 `ClientAdmin/DetailAsync`；完整客户档案编辑仍走 Admin。
- 新接口出参是嵌套 `codeSource` 对象，不是扁平 `codeSourceId`。
- Query 入参使用 camelCase `id`（Guid 保持 string）。
