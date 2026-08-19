# 海运出口服务项完成时必填附件类型前端对接

- 日期：2026-08-19
- 类型：Feature
- 影响页面：`/basic-data/se-service-config`、`/sea-exports/create`、`/sea-exports/:id/edit`、`/workspace`
- 关联接口：`GetServiceTypesByPOLAsync`、`SeServiceConfigAdmin` 增删改详情、`SeServiceTaskAdmin/CompleteAsync`、`AttachmentDtlType/GetListByModuleTypesAsync`

## 背景意图

完成服务项任务时，除原有必填字段、必填费用外，港口配置还可以指定必须先上传的附件类型（例如订舱前必须有托书、提单）。配置仍走 `seServiceRequires`，用扩展枚举 `10001` 表示附件类型，具体类型 id 写在 `requireValues`（`"1|2"`）。

`GetServiceTypesByPOLAsync` 的 `seServiceShows` / `seServiceLocks` / `seServiceRequires` 从 `int[]` 改为对象数组，前端必须同步改类型与取值，否则展示/锁定/必填都会错。

## 核心逻辑变更

1. **破坏性类型（`ServiceTypeByPolDto`）**
   - 三个列表改为 `{ seaExportPropEnum, requireValues }` 对象数组。
   - `normalizeRequiredProps` / 锁定字段并集改为取 `seaExportPropEnum`，并跳过 `≥10001` 的扩展类型。
   - 仍兼容历史 `number[]` 以防灰度期间混用。

2. **港口服务项配置**
   - 必填项下拉增加「附件类型」（`10001`）；展示/锁定不下发该值。
   - 选中后出现附件类型多选，数据来自 `AttachmentDtlType/GetListByModuleTypesAsync`，仅「展示模块 = 海运出口」的类型可选。
   - 提交时普通字段只传 `seaExportPropEnum`；`10001` 再拼 `requireValues`。UI 合并为单行。
   - 选了附件类型但未勾具体 id 时拦截，文案与后端一致。

3. **完成任务**
   - 海出编辑页 Tooltip 提示「完成前需上传」及尚未上传的必填类型；已传齐则不显示「去上传」。仅「去上传」可点并切到附件 Tab，样式与类型名称区分（橙色按钮）。点完成只提示缺的必填类型，不自动跳转。
   - 工作台点完成会先按当前服务项配置预检本票附件：缺则弹出「请先上传附件」，点「前往上传」后再跳到对应海出编辑页附件 Tab（pending Tab + `?tab=attachments`，批量时打开第一条缺附件的票）；点取消留在工作台。已传齐才弹出「确认完成」。后端仍报缺附件时同样先弹窗、前往上传后再跳。
   - 入参仍是 `{ id }`；缺附件以后端校验为准，全局拦截器展示 `UserFriendlyException` 文案，前端不再套一层「完成服务失败」。

## 避坑指南

- `requireValues` 是竖线分隔字符串，不是 `number[]`。解析必须 `split('|')` 后按完整 token 比较，禁止 `includes('1')`，否则会误伤 `11`。
- 附件类型 id 按字符串透传，不要 `Number(id)`，避免大整数丢精度。
- `10001` 只能出现在 `seServiceRequires`。配到展示/锁定会被后端拒绝。
- 完成校验看的是「这票海出有没有这个附件类型」，不区分是哪个服务项上传的。类型被删或不属于海运出口展示模块时，配置页仍可回显为「未知类型(id)」。
- 带出服务项地址必须是 `GetServiceTypesByPOLAsync`，写成 `GetServiceTypesByPOL` 会 404。
- 配置页不要改回 `GetListAsync` 全量：必填附件类型下拉只展示模块为海运出口的类型，与附件 Tab 默认口口径一致。
- 工作台跳附件必须先 `setSeaExportEditPendingTab` 再 `push`，并带 `query.tab=attachments`。页签 key 默认是 `fullPath`，进页后若立刻 `replace` 掉 query 会整页重挂并读回上次的「基础信息」。因此 `SeaExportEdit` 设了 `fullPathKey: false`，且命中 pending/query 时立刻写入 Tab 记忆。
