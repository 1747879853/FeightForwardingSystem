# 海运出口编辑页代收支误勾选修复

## 背景意图

编辑页打开时，若详情接口未返回代收支（`serviceTypes` 不含 `5`），服务项目卡片仍显示「代收支」已勾选。用户误以为订单已启用该服务，保存时还可能写入 `serviceTypes: [5]`。

## 核心逻辑变更

1. **编辑详情回填**（`form.vue` → `loadEditData`）
   - 移除加载后 `syncServiceTypesByPol({ force: true })`，避免 `GetServiceTypesByPOLAsync` 的 `checked` 覆盖已保存订单的服务项状态。
   - 代收支勾选与部门回显改为与订舱～保险一致：仅当详情解析出的 `serviceTypes` 含 `5` 时勾选；`organizationUnits` 仅在有代收支服务时用于回填部门下拉。
2. **新建页行为不变**
   - 仍通过 `onMounted` 调用 `syncServiceTypesByPol()`，以及委托单位/起运港 `onChange` 联动。

3. **暂时隐藏代收支 UI**（`SHOW_COLLECTION_PAYMENT_FIELD = false`）
   - 服务项目卡片不渲染代收支；保存时不写入 `serviceTypes` 的 `5` 与 `organizationUnits`。
   - 恢复展示时将常量改为 `true` 即可。

## 避坑指南

- **代收支与其它服务项字段不同**：无独立 `xxxId` 表单字段，状态在 `collectionPaymentEnabled` / `collectionPaymentDeptId`；勿仅凭 `organizationUnits` 有值推断已勾选。
- **编辑 vs 新建联动**：编辑页仅在用户修改委托单位或起运港时触发 `queueSyncServiceTypesByPol`；初始回显以 `DetailAsync` 为准。
- **隐藏开关**：`form.vue` 内 `SHOW_COLLECTION_PAYMENT_FIELD`，勿删联动逻辑，便于后续恢复。
