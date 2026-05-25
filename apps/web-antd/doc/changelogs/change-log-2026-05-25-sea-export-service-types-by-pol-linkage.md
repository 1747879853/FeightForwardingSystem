# 海运出口表单：委托客户 + 起运港联动服务项目

## 背景意图

海运出口新建/编辑页的服务项目（订舱、拖车、报关、仓库、保险、代收支）需与「起运港服务项配置」及「委托单位排除服务项」一致。业务期望：选定委托客户与起运港后，自动查询该组合下应启用的服务项并勾选回显，减少手工勾选遗漏。

## 核心逻辑变更

1. **API 封装**（`src/api/sea-export/sea-export-admin.ts`）
   - 新增 `getServiceTypesByPOL`，请求 `GET /services/app/SeaExportAdmin/GetServiceTypesByPOLAsync`。
   - Query：`polId`（必填才有意义）、`clientId`（可选，用于排除客户已排除的服务项）。
   - 类型：`ServiceTypeByPolDto`（`serviceType`、`sortId`、`checked`、`seServiceShows/Locks/Requires`）。

2. **表单联动**（`src/views/sea-export-admin/form.vue`）
   - 监听基础信息区 `clientId`、港口区 `polId` 的 `onChange`（勿用 `onUpdate:modelValue`，否则与表单 `v-model` 冲突导致委托单位未写入模型，见 [委托单位已选仍提示必选](./change-log-2026-05-25-sea-export-clientid-select-validation-fix.md)）。
   - 使用 `linkedClientId` / `linkedPolId` 缓存最新值；`queueSyncServiceTypesByPol` 合并同轮多次事件；`queryKey`（`polId::clientId`）去重，避免重复请求。
   - `polId` 为空时清空全部服务项勾选（含代收支）。
   - 响应解析：`extractServiceTypesByPolResult` 兼容直接数组与 ABP 包装 `{ result: [...] }`。

3. **勾选回显规则**
   - 接口项 `checked === true` → 对应 UI 勾选；`false` → 取消勾选并清空该服务项已选客户。
   - `serviceType` 与页面映射（与 `ServiceType` 枚举一致）：| serviceType | 页面表现 | | :---: | :--- | | 0 | 订舱代理 | | 1 | 车队（拖车） | | 2 | 报关行 | | 3 | 仓库 | | 4 | 保险公司 | | 5 | 代收支（组织部门下拉） |
   - 保存时 `serviceTypes` 由勾选状态汇总；代收支勾选时额外写入 `5`。

4. **编辑回显**
   - 详情加载后 `syncServiceTypesByPol({ force: true })` 再按接口覆盖勾选，与详情里已有 `serviceTypes` 对齐港口配置。

## 避坑指南

- **`checked` 语义**：`true` 表示该客户**未排除**此服务项（应勾选），与「客户排除服务」Tab 里开关方向相反，勿混淆。
- **勿重复绑定事件**：`bindServiceTypeLinkageEvents` 仅在表单初始化时调用一次；编辑页 `loadEditData` 内勿再次绑定，否则会出现双请求。
- **请求去重**：若 Network 仍见两次，检查是否另有 `portName` 联动或组件二次 `update:modelValue`；当前以 `queryKey` + 微队列合并缓解。
- **接口路径**：Swagger/文档常写 `GetServiceTypesByPOL`，前端实际调用 `GetServiceTypesByPOLAsync`（与项目其他 SeaExportAdmin 接口一致）。
- **`seServiceShows/Locks/Requires`**：当前仅回显勾选，字段级展示/锁定/必填规则尚未在前端消费，后续可扩展。
