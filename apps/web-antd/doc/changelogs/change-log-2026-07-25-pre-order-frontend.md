# 2026-07-25 业务联系单前端全量实现（列表 / 编辑 / 审核 / 工作台）

## 背景意图

后端已完成业务联系单（PreOrder）模块，并提供了完整的功能文档、接口文档与变更记录（`D:\code\Freight\aspnet-core\文档\业务联系单`）。前端此前没有任何对应页面，本次按 `doc/prd/pre-order-prd.md` 一次性补齐前端全链路：列表检索、单据录入编辑、提交与审核动作、审核中心任务页、工作台审核 Tab。

业务联系单是海运出口委托的「前置单据」：销售先录入意向业务与报价，审核通过后由系统生成海运出口单，业务正式进入操作流程。

## 核心逻辑变更

### 1. 新增 API 层 `src/api/pre-order/pre-order-admin.ts`

- 单据状态枚举 `PreOrderStatus`：`0 录入 / 1 待审核 / 2 通过 / 3 驳回`。
- 服务项对比枚举 `PreOrderServiceCompareStatus`：`0 相同 / 1 海运出口新增 / 2 海运出口删除`，由后端在详情接口计算。
- 覆盖 `GetPagedList`、`Detail`、`Add`、`Edit`、`Delete`、`Submit`、`UnSubmit`、`Audit`、`Reject`、`PreOrderTaskList`、`TransportOrderDetail`。
- 子表 DTO：品名 `preOrderCodeGoodss`、箱型箱量 `preOrderCtns`、干系人 `preOrderUsers`、服务项 `preOrderServices`、费用 `preOrderFees`。

### 2. 审核时间轴复用

`TaskType` 枚举扩展 `PreOrder = 8`（与后端 `FrightModule.PreOrder` 同值）。`workflow-timeline` 组件本身无需改造，调用 `open({ entityId, taskType: TaskType.PreOrder })` 即可。

### 3. 路由与菜单

- 「操作管理」下新增 `/pre-order`（列表）、`/pre-order/add`、`/pre-order/:id/edit`，权限 `Admin.PreOrder*`。
- 「审核审批」下新增 `/audit-approval/pre-order-review`，权限 `Admin.PreOrder.Audit`；父级菜单权限白名单一并追加。

### 4. 页面结构

- 列表 `views/pre-order/list.vue`：vxe-grid + 搜索表单，双击进编辑，顶部新建 / 复制 / 删除。删除前在前端拦截非「录入 / 驳回」状态。
- 编辑 `views/pre-order/editor.vue`：顶部 `content-tabs`（样式对齐海运出口编辑器），两个 Tab：
  - **基础信息**：基础信息 / 港口航线 / 收发通与货物三段 `useVbenForm`，加干系人、箱型箱量、服务项、费用四个子区。
  - **关联海运出口**：仅在「通过」且存在 `transportOrderId` 时出现，直接内嵌完整的 `sea-export-admin/editor.vue`。
- 审核中心 `views/audit-approval/pre-order-review/index.vue`：任务列表 + 双击跳转单据详情，审核动作在详情页完成。
- 工作台新增「业务联系单审核」Tab，复用既有审核 Tab 的行结构（`BusinessRow`）与筛选栏（新增 `pre-order-review` 模式）。

### 5. 服务项：仅海运出口主流程

候选池 = `SeaExportAdmin/GetServiceTypesByPOLAsync({ polId, clientId })` 的结果 ∩ `ServiceType` 枚举 `extra1 === true` 的主流程项。该接口本身已按委托单位剔除客户排除项，与后端校验用的「最大集合」口径完全一致，所以前端勾选结果天然满足「可少不可多」。

起运港或委托单位变更后，已勾选但不在新候选池内的服务项会被自动剔除，避免提交时被后端拦截。

### 6. 费用：应收应付都可录，应收箱型行单价与数量只读

- 收付类型 `paySide` 作为可编辑列，应收（0）与应付（1）都能录。
- 单位下拉 = 通用单位（票 / 重量 / 体积 / TEU）+ 当前箱型箱量表里已选的箱型名。
- **应收 + 单位命中箱型**时，含税单价取该箱型的**卖价**、数量取**箱量**，两个单元格置灰不可改；箱型行的卖价或箱量变化会实时刷回费用行。
- 应付行的单价与数量始终手填。
- 金额 = 含税单价 × 数量；不含税单价 = 含税单价 ÷ (1 + 税率/100)。

### 7. 权限与未保存拦截（对齐仓库既有惯例）

- 按钮级权限：列表页与编辑页用 `createAbpPermission('Admin.PreOrder')` + `v-access:code` 控制新建 / 复制 / 删除 / 保存 / 提交 / 撤回；保存按钮按新建或编辑分别取 `perm.add` / `perm.edit`。
- 审核类按钮（审核通过 / 驳回 / 审核后驳回）用 `useAccess().hasAccessByCodes(['Admin.PreOrder.Audit'])` 的 computed 控制，因为要与状态条件组合。
- 未保存拦截：`useUnsavedGuard({ isDirty })`，脏检查用「提交 DTO 的稳定 JSON 快照」比对，与海运出口一致。基线在详情加载完成、新增后跳转前各同步一次；只读状态直接返回不脏。

### 8. 编辑页布局对齐海运出口

- 复用 `sea-export-admin/basic-info-form/form.css`：主栏 `content-column` + 分区 `section-title-bar`、货物/服务/费用用 `cargo-container-card`，干系人落到右侧 `right-column`（与海出同为 180px）。
- 顶部 sticky Tab 只负责「基础信息 / 关联海运出口」；保存、提交、审核等动作移入基础信息区 `content-section__actions`，与海出编辑器一致。
- 表单密度对齐：`form-controls-small` + `grid-cols-6/3/6/4`；收发通与货物拆成 `PartyForm` / `CargoForm`。
- 分区标题 meta 区对齐海出：展示业务编号、状态，并把「归属组织」「装运方式」从表单挪到 meta 区选择器（`headerOrgId` / `headerBlType` 独立 ref，提交时并入 payload，保存前校验归属组织必选）。
- 干系人由表格改为 `order-user-panel` 卡片行：默认展示销售/商务(航线)/操作/客服/单证（与海出 `defaultOrderUsers` 一致），角色名为固定文案（商务显示为「商务(航线)」），每行带用户头像（`getUser` 懒加载详情，缺省用系统默认头像），新增走「添加角色」弹窗；销售/操作不可删。
- 服务项目移入基础信息区顶部 `content-section__actions-left`：chevron 流水线展示已选主流程节点，`...` /「去配置」打开勾选弹窗（仅主流程候选），对比标记「新增/删除」挂在节点上。

### 9. 审核动作

- 提交审核 / 撤回按状态显隐；「审核通过」弹窗在缺少「操作」干系人时强制指派，否则后端无法生成海运出口。
- 「审核后驳回」仅在「通过」状态出现，操作前二次确认提示必须先删除关联海运出口。

## 避坑指南

1. **业务联系单 id 与海运出口 id 相同**。后端 `PreOrder.TransportOrderId` 与 `PreOrder.Id` 一致，因此在 `/pre-order/:id/edit` 内嵌海运出口编辑器时，被嵌组件从 `route.params.id` 读到的正是同一个 id，无需额外传参。改动路由参数名会直接打断这个链路。
2. **服务项对比行不要当成已勾选项**。详情返回的 `preOrderServices` 里，`compareStatus = 1`（海运出口新增）的记录是后端以 `id = 0` 追加的虚拟行，业务联系单本身并未勾选。回显时必须按 `id !== 0` 过滤，否则保存会把海运出口侧新增的服务项写回业务联系单。
3. **a-table 插槽的 `record` 是 `Record<string, any>`**，把它传给强类型函数会报 TS2345。给 `<template #bodyCell>` 加类型标注不被 ant-design-vue 的 slot 类型接受，本次统一在每个子表内定义 `asRow()` 在模板边界做一次收敛。
4. **销售干系人必填且唯一**，其余角色各 0-1 人。前端在保存前拦截，避免白跑一次请求；干系人角色下拉会禁用已被其他行占用的属性。
5. **`getServiceTypesByPOL` 必须同时传 `clientId`**，否则拿到的候选池不含客户排除项过滤，会出现前端能勾、后端拒收的情况。
