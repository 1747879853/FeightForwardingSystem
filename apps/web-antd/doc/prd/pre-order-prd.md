---
title: 业务联系单 PRD
module: 业务联系单
route: /pre-order、/pre-order/add、/pre-order/:id/edit、/audit-approval/pre-order-review、工作台「业务联系单审核」
version: v1.0
last_updated: 2026-07-25
audience: 产品 / 前端 / 后端 / QA
reference: >
  D:/code/Freight/aspnet-core/文档/业务联系单/业务联系单功能文档.md、 业务联系单接口文档.md、业务联系单-2026-07-14.md； 原型 https://rp.mockplus.cn/run/HDY9RVAVTO/9xsBuTZUWO/eOtSK3XZA ； 付费申请工作流时间轴 apps/web-antd/src/components/workflow-timeline/ ； 海运出口编辑器 apps/web-antd/src/views/sea-export-admin/editor.vue
---

# 业务联系单 PRD

> **模块名称：** 业务联系单（`PreOrder`）  
> **页面路径：** 列表 `/pre-order`、新建 `/pre-order/add`、详情编辑合一 `/pre-order/:id/edit`、审核中心 `/audit-approval/pre-order-review`、工作台「业务联系单审核」Tab  
> **权限标识：** `Admin.PreOrder`（`Add` / `Get` / `Edit` / `Delete` / `Audit`）  
> **文档版本：** v1.0  
> **更新日期：** 2026-07-25  
> **权威后端：** `D:\code\Freight\aspnet-core\文档\业务联系单\`（功能/接口/变更，2026-07-14）  
> **原型：** [摹客RP · 业务联系单](https://rp.mockplus.cn/run/HDY9RVAVTO/9xsBuTZUWO/eOtSK3XZA?cps=expand&rps=expand&nav=1&ha=1&la=1&fc=0&out=1&rt=1&dt=none&as=true)

---

## 1. 产品概述

### 1.1 业务背景

业务联系单是销售在正式建立运输业务（`TransportOrder` + `SeaExport`）之前，登记一票业务意向与费用预估的前置单据。销售录入委托、港口、箱型卖价、主流程服务、应收应付预估费用后提交审核；审核通过后系统自动生成海运出口（录入方式=`业务联系单导入`），操作台账出现待接单业务。

### 1.2 核心概念

| 概念 | 说明 |
| --- | --- |
| PreOrder | 业务联系单主表及子表（品名、箱型箱量、干系人、服务、费用、分组附件） |
| TransportOrder / SeaExport | 审核通过后生成；**三者 Id 与 PreOrder.Id 完全一致**；`InputType=1`（业务联系单导入） |
| 主流程服务 | `ServiceType` 枚举 `enable=true` 且 `extra1=true` |
| compareStatus | 详情服务项与关联海运出口主流程服务的对比标记（后端实时计算） |
| 工作流 | 与付费申请同构：`TaskItem` + `WorkFlowInstance`，`TaskType/FrightModule=PreOrder=8` |

### 1.3 核心价值

| 维度 | 说明 |
| --- | --- |
| 操作粒度 | 一票联系单 → 审核通过生成一票海运出口（同 Id） |
| 使用场景 | 销售下单预估 → 审核人审批并指定操作 → 操作在出口侧接单执行 |
| 下游影响 | 生成 `OrderCtn`/`SeaExportService`/`OrderFee`（自动提交费用审核）、附件带入海运出口 |

### 1.4 本期范围 / 不在范围

**本期做：**

- 列表、新建、详情编辑合一、复制
- 提交审核 / 撤回 / 审核通过·驳回 / 审核后驳回
- 审核时间轴（复用付费申请 `workflow-timeline`）
- 服务项仅主流程可选；详情 `compareStatus` 展示
- 费用单表（含收付类型），应收箱型单价/数量与卖价·箱量联动
- 关联海运出口顶部 Tab，嵌入完整可编辑海运出口编辑器
- 审核中心页 + 工作台「业务联系单审核」Tab

**本期不做：**

- 打印
- 现舱库存（总库存/已使用/未使用）
- 海运进口及其他 `BizType`（后端仅海运出口已落地，前端本期只做 `bizType=0`）
- 独立「已作废」状态（后端无此状态）

---

## 2. 目标用户与权限

| 角色 | 典型操作 |
| --- | --- |
| 销售 | 新建/编辑/复制/提交审核/撤回；维护箱型卖价与应收费用 |
| 审核人（工作流节点） | 待审列表进入详情；通过/驳回；审核时可指定「操作」干系人 |
| 操作/客服等干系人 | 通过后在「关联海运出口」Tab 内编辑出口；删除出口以便审核后驳回 |
| 商务等 | 录入应付费用（单价手填） |

| 权限 | 说明 |
| --- | --- |
| `Admin.PreOrder.Get` | 列表、详情、`TransportOrderDetailAsync` |
| `Admin.PreOrder.Add` | 新建 |
| `Admin.PreOrder.Edit` | 编辑、提交审核、撤回、审核、审核后驳回 |
| `Admin.PreOrder.Delete` | 删除（仅录入/驳回） |
| `Admin.PreOrder.Audit` | 待我审核任务列表（审核中心、工作台 Tab） |
| `Admin.SeaExport.*` | 关联 Tab 内嵌出口编辑器时的出口侧读写（沿用现有海出权限） |
| `Admin.TransportOrder.Get` | 业务侧反查联系单（`PreOrderDetailAsync`，本期可选） |

> 说明：后端规定提交/撤回/审核/审核后驳回均走 **Edit** 权限；任务列表走 **Audit** 权限。前端按钮需按权限 + 状态双重控制。

---

## 3. 功能清单

| # | 功能 | 入口 | 优先级 |
| --- | --- | --- | --- |
| F1 | 业务联系单列表（筛选/分页/选中行操作） | `/pre-order` | P0 |
| F2 | 新建（保存后跳编辑页） | `/pre-order/add` | P0 |
| F3 | 详情编辑合一（状态驱动只读） | `/pre-order/:id/edit` | P0 |
| F4 | 复制（详情预填进新建，清 id/单号/状态） | 列表顶部 | P0 |
| F5 | 服务项：仅主流程候选，可少不可多 | 基础信息 | P0 |
| F6 | 提交审核 / 撤回 | 详情工具栏 | P0 |
| F7 | 审核通过 / 审核驳回（可指定操作） | 详情工具栏 | P0 |
| F8 | 审核时间轴（`TaskType=8`） | 详情顶部按钮 | P0 |
| F9 | 审核后驳回（须先删关联海运出口） | 详情工具栏 | P0 |
| F10 | 费用单表 + 收付类型；应收箱型联动卖价/箱量 | 基础信息 | P0 |
| F11 | 服务对比 `compareStatus` 展示 | 基础信息·服务区 | P0 |
| F12 | 顶部 Tab：基础信息 / 关联海运出口（嵌入整页出口编辑器） | 详情 | P0 |
| F13 | 审核中心任务列表 | `/audit-approval/pre-order-review` | P0 |
| F14 | 工作台「业务联系单审核」Tab | 工作台 | P0 |
| F15 | 打印 | — | 不做 |
| F16 | 现舱库存 | — | 不做 |

---

## 4. 页面结构

### 4.1 列表 `/pre-order`

遵循 `web-antd-list-form-conventions`：

- **无操作列**；选中行 + 顶部按钮 + **双击行进编辑页**
- 顶部按钮：新建、复制（需选中 1 条）、删除（录入/驳回）、刷新
- 筛选对齐 `PreOrderQueryDto`：关键字（业务编号/主提单号）、业务类型、状态、委托单位、起运港、目的港、开船日期、创建人、组织等
- 列表不含子表；展示业务编号、状态、委托单位、起运港、目的港、ETD、船公司、创建人、创建时间等主表字段

### 4.2 新建 `/pre-order/add`

- 页面级表单；保存成功 → 跳转 `/pre-order/{id}/edit`
- 初始状态固定「录入状态」；业务编号后端生成（规则未配置时可为空）

### 4.3 详情编辑合一 `/pre-order/:id/edit`

**顶部 content-tabs（参考海运出口 `editor.vue`）：**

| Tab | 显示条件 | 内容 |
| --- | --- | --- |
| 基础信息 | 始终 | 主表 + 箱型箱量 + 干系人 + 服务项 + 费用单表 + 分组附件 + 备注 |
| 关联海运出口 | `status=通过` 且 `transportOrderId` 有值 | **嵌入完整可编辑** `sea-export-admin/editor`（同 Id）；权限走海出模块 |

**工具栏按钮（按状态显隐）：**

| 状态 | 可用动作 |
| --- | --- |
| 录入(0) / 驳回(3) | 保存、提交审核、删除（删除也可在列表） |
| 待审核(1) | 撤回；当前审核人：审核通过、审核驳回（可填意见、可指定操作） |
| 通过(2) | 查看审核流程；审核后驳回（有关联出口时后端拦截并提示先删除） |
| 任意（有工作流实例） | 「审核流程」按钮 → `workflow-timeline` 弹窗 |

表单只读规则：仅 **录入 / 驳回** 可编辑主表与子表；待审核、通过整单只读（关联出口 Tab 内出口仍可按海出权限编辑）。

### 4.4 审核中心 `/audit-approval/pre-order-review`

- 对齐付费申请审核页结构：任务列表 + 双击进 `/pre-order/:id/edit`
- 数据源：`PreOrderTaskListAsync`（`Admin.PreOrder.Audit`）
- 支持待我审核 / 我审核过（`myStatus`）及联系单侧筛选条件

### 4.5 工作台

在 `serviceTabs` 增加 `{ key: 'pre-order-review', label: '业务联系单审核' }`，数据与交互对齐「付费申请审核」Tab（拉 `PreOrderTaskListAsync`，行点击进编辑页）。

---

## 5. 状态流转

| 当前状态 | 触发动作 | 目标状态 | 说明 |
| --- | --- | --- | --- |
| （无） | 新建 | 录入(0) | 可改、可删、可提交 |
| 录入(0) / 驳回(3) | 提交审核 `SubmitAsync` | 待审核(1) | 生成任务+工作流；无工作流或全自动通过时直接到通过并生成业务表 |
| 待审核(1) | 撤回 `UnSubmitAsync` | 录入(0) | 删除任务与工作流实例 |
| 待审核(1) | 审核通过（末级）`AuditAsync(success=true)` | 通过(2) | 须有「操作」干系人；生成 TO+SeaExport |
| 待审核(1) | 审核驳回 `AuditAsync(success=false)` | 驳回(3) | 可改后重提 |
| 通过(2) | 审核后驳回 `RejectAsync` | 驳回(3) | **若关联海运出口仍存在则禁止**，提示「请先删除海运出口数据」 |

枚举：`PreOrderStatus`：录入=0，待审核=1，通过=2，驳回=3。

---

## 6. 核心业务规则

### 6.1 干系人（`preOrderUsers`）

- **销售(`UserAttribute=16`)必填且唯一**
- 其余属性（操作/客服/单证/商务等）各 0–1；属性不可为 `None`
- 审核每一步可通过 `operationUserId` 重新指派「操作」
- **整单通过时必须存在操作干系人**，否则报错「需要指定操作后方能审核通过」
- 工作流节点若配置了 `UserAttribute`，须能在干系人中匹配到，否则报「审核人需要{属性}干系人属性请先设置该干系人」

### 6.2 服务项（仅主流程）

**候选最大集合（可少不可多）：**

1. `SeServiceConfig` 按起运港命中（未命中取默认港 `polId=null`）
2. 减去 `ClientExceptService`（`clientId + polId`）
3. 与 `ServiceType` 中 `enable && extra1=true` 取交集

**前端约束：**

- 服务区**只展示/只允许勾选**上述最大集合内的项；非主流程不可添加也不可显示
- `bizType=海运出口` 时 **起运港必填**；未选起运港时服务区置灰并提示先选起运港
- 委托单位或起运港变更后重新拉取候选并校验已选项是否仍合法

**审核通过生成海运出口服务：**

1. 主流程部分 = `valuesTrue ∩ 联系单服务项`
2. 非主流程部分 = `valuesFalse` **全量**自动带入（联系单 UI 不展示这些项，但出口会有）
3. `sortId` 取自 `SeServiceConfig`

### 6.3 服务对比（`compareStatus`）

仅海运出口且已生成业务表时，详情 `preOrderServices` 带：

| 值 | 含义 | UI 建议 |
| --- | --- | --- |
| 0 | 相同 | 默认样式 |
| 1 | 海运出口新增 | 标签「新增」（出口有、联系单无；后端可能追加 `id=0` 行） |
| 2 | 海运出口删除 | 标签「删除」（联系单有、出口主流程中无） |

前端只读展示，不回传。切换回「基础信息」Tab 时可重新拉详情以刷新对比。

### 6.4 箱型箱量与费用

**箱型行（`preOrderCtns`）：** `ctnCodeId`、`count`、`sugPrice`（指导价）、`price`（卖价）、`weight`、`remark`。

**费用（`preOrderFees`）：单表 + `paySide` 列（0 应收 / 1 应付）。**

字段与联动参考海运出口应收应付（费用代码→结算对象/币别/税率、金额=单价×数量、含税/不含税换算等），但 UI **不分 Tab**。

| 场景 | 含税单价 | 数量 |
| --- | --- | --- |
| 应收 + 单位=某箱型名 | **取该箱型卖价，只读**；卖价变更实时刷新匹配行 | **=该箱型箱量，只读**；箱量变更实时同步并重算金额 |
| 应收 + 非箱型单位（票/重量/体积/TEU 等） | 可手填 | 可手填（或按现有费用逻辑带默认） |
| 应付（任意单位） | **全程可手填**，不从箱型带价 | 可手填 |

审核通过生成 `OrderFee` 时后端会按单位字符串重算数量与金额，并将本次费用自动提交费用审核（失败静默，不回滚主流程）。前端预估应尽量与后端规则一致，避免落库金额大幅偏离。

### 6.5 审核通过生成内容（后端已实现，前端需知）

- `TransportOrder`：`InputType=1`，Id = PreOrder.Id
- `SeaExport`：同 Id；`OrderCtn` 按箱量逐条展开
- 服务项：主流程∩联系单 + 非主流程全量
- 费用：跳过缺 `FeeCodeId/CurrencyId/PaySide` 的行；其余生成后自动提交费用审核
- 附件：复用同一 `AttachmentId`，以海运出口维度新建关联（`ModuleTypeId=160040`）

### 6.6 审核后驳回

- 仅状态=通过可调 `RejectAsync`
- 若 `TransportOrder`/`SeaExport` 仍存在 → 禁止，提示先删除海运出口
- 用户须在「关联海运出口」或海出列表中删除出口后，再在联系单点审核后驳回 → 状态变驳回，清空 `transportOrderId`
- 前端：拦截错误时 Toast 展示后端文案，并可引导用户切到「关联海运出口」Tab

### 6.7 复制

- 选中一条 → 读 `DetailAsync` → 进入新建页预填
- 清空：`id`、`preOrderNum`、`status`、`transportOrderId`、审计字段、子表主键 id
- 保留：业务字段、箱型、干系人、服务、费用、附件引用策略（若附件需重新上传则清空 attachmentGroup，实现时与附件模块约定一致，建议复制时保留 attachmentId 引用或按产品二次确认）
- 保存走 `AddAsync`

### 6.8 委托单位选择

走业务用户客户接口（`Client` 简易分页），无客户管理权限的用户也能选委托单位（见 `doc/客户/客户通用文档.md`）。

---

## 7. 审核时间轴

- 组件：复用 `apps/web-antd/src/components/workflow-timeline/`
- 调用：`getWorkFlowInstanceDetail({ entityId: preOrderId, taskType: PreOrder })`
- **前端改造点：** `TaskType` 枚举需新增 `PreOrder = 8`（当前仅到 `PaymentApplication = 3`）
- 展示形态：详情页顶部按钮打开弹窗（与付费申请一致），不单独占 Tab

工作流条件字段仅支持 `8001`（申请人）/`8002`（申请人组织）。

---

## 8. 接口清单（前端对接）

控制器：`PreOrderAdmin`（均需登录）

| 方法           | 路径                                | 权限   |
| -------------- | ----------------------------------- | ------ |
| 列表           | `GET .../GetPagedListAsync`         | Get    |
| 详情           | `GET .../DetailAsync`               | Get    |
| 新增           | `POST .../AddAsync`                 | Add    |
| 修改           | `PUT .../EditAsync`                 | Edit   |
| 删除           | `DELETE .../DeleteAsync`            | Delete |
| 提交审核       | `POST .../SubmitAsync`              | Edit   |
| 撤回           | `POST .../UnSubmitAsync`            | Edit   |
| 审核           | `POST .../AuditAsync`               | Edit   |
| 审核后驳回     | `POST .../RejectAsync`              | Edit   |
| 待我审核任务   | `GET .../PreOrderTaskListAsync`     | Audit  |
| 查关联业务详情 | `GET .../TransportOrderDetailAsync` | Get    |

关联 Tab 内嵌出口编辑器时，出口数据读写仍走既有 `SeaExportAdmin` 等接口（Id = 联系单 Id）。

字段与 DTO 细节以《业务联系单接口文档》为准，此处不重复全文。

---

## 9. 字段与表单分区（基础信息）

### 9.1 主表要点

| 字段 | 必填 | 说明 |
| --- | --- | --- |
| bizType | 是 | 本期固定海运出口(0) |
| orgId | 是 | 归属组织（所属人直属组织） |
| blType | 是 | 装运方式（整柜等） |
| clientId | 是 | 委托单位 |
| cargoId | 是 | 货物类型 |
| polId | 海出时是 | 起运港（服务候选依赖） |
| 销售（users） | 是 | 见 6.1 |
| 其余港口/船公司/收发通/ETD/货好/件数包装毛重尺码/备注等 | 否 | 对齐原型与接口 |

### 9.2 子表

- 品名 `preOrderCodeGoodss`
- 箱型箱量 `preOrderCtns`（含指导价/卖价/货重）
- 干系人 `preOrderUsers`
- 服务 `preOrderServices`（仅主流程）
- 费用 `preOrderFees`（含 `paySide`）
- 分组附件 `attachmentGroup`（结构同海运出口；编辑全量覆盖）

编辑子表均为**全量覆盖**，前端提交须带完整子表。

---

## 10. 与原型差异说明

| 原型 | 本期结论 |
| --- | --- |
| 打印按钮 | 不做 |
| 现舱库存块 | 不做 |
| 费用「所有字段非必填」 | 遵循；但销售、委托单位、装运方式、货物类型、起运港（海出）、orgId 等主表卡点仍以后端校验为准 |
| 审核通过→操作台账「业务下单」 | 由生成 `InputType=1` 的海运出口体现；操作台账筛选/展示属海出域既有能力 |
| 详情顶部多区块 | 收敛为两 Tab：基础信息 + 关联海运出口 |

---

## 11. 前端实现要点与依赖

| 项 | 说明 |
| --- | --- |
| 路由/菜单 | 新增 PreOrder 模块路由；审核中心子路由；权限键已在 `auth.json` |
| TaskType | 扩展 `PreOrder = 8` |
| 服务候选 | 需封装：拉 `SeServiceConfig`（或等价接口）+ 客户排除 + 枚举 Extra1 过滤；可参考海出 `service-type.ts` / `loadSeServiceTypeEnumItems` |
| 费用联动 | 可复用/裁剪 `useOrderFeeLinkage` 思路；注意单表 + paySide 与箱型卖价联动规则 |
| 嵌入出口编辑器 | 关联 Tab 挂载 `editor.vue`（或等价），传入同 Id；切换 Tab 时各自脏检查（联系单基础信息 vs 出口） |
| 列表规范 | 无操作列、双击进编辑、新建成功跳编辑 |
| biz-select | 委托单位/港口/用户/船公司等优先复用 `adapter/component/biz-select` |

---

## 12. 测试要点（摘要）

| # | 场景 | 期望 |
| --- | --- | --- |
| T1 | 未选起运港保存海出联系单 | 后端/前端拦截：起运港不能为空 |
| T2 | 勾选非主流程或超最大集合 | 前端不可选；若绕过则后端报超出允许范围 |
| T3 | 无销售 / 双销售 | 保存失败 |
| T4 | 提交→撤回 | 回录入，可再编辑 |
| T5 | 审核通过无操作干系人 | 失败并提示指定操作 |
| T6 | 审核通过 | 生成同 Id 海运出口；关联 Tab 出现；费用进入费用审核 |
| T7 | 出口侧增删主流程服务后回联系单 | compareStatus 正确显示新增/删除 |
| T8 | 通过后直接审核后驳回（未删出口） | 失败，提示先删海运出口 |
| T9 | 删出口后再审核后驳回 | 成功→驳回，可再编辑提交 |
| T10 | 应收单位=20GP，改卖价/箱量 | 匹配费用行单价/数量/金额实时变；单价数量不可手改 |
| T11 | 应付费用改卖价 | 应付单价不变（手填） |
| T12 | 工作台/审核中心待审任务 | 能进详情并完成审核；时间轴可打开 |
| T13 | 复制 | 新建页带出业务数据，保存生成新单号/新 Id |
| T14 | 无工作流自动通过 | 提交即通过并生成出口（须已有操作干系人） |

---

## 13. 决策记录（Grill 结论）

| 议题 | 结论 |
| --- | --- |
| 生命周期 | 以后端为准：审核中驳回→驳回；通过后须先删出口再 `RejectAsync`→驳回；待审核可撤回→录入 |
| 审核机制 | 工作流 + `workflow-timeline`，`TaskType=8` |
| 服务候选 | POL 配置 − 客户排除 ∩ 主流程；起运港必填 |
| 服务对比 | 后端 `compareStatus` 实时计算，前端只读 |
| 费用范围 | 应收 + 应付都能录 |
| 单价规则 | 应收+箱型单位→卖价只读并与卖价/箱量联动；应付全程手填 |
| 数量规则 | 应收+箱型单位→数量=箱量只读 |
| 费用 UI | 单表 + 收付类型列 |
| 页面 | 详情编辑合一；审核中心 + 工作台 Tab |
| 关联出口 UI | 顶部两 Tab；嵌入完整可编辑海出编辑器 |
| 复制/打印/现舱 | 复制做；打印、现舱不做 |

---

## 14. 参考文档

- 后端功能文档：`D:\code\Freight\aspnet-core\文档\业务联系单\业务联系单功能文档.md`
- 后端接口文档：`D:\code\Freight\aspnet-core\文档\业务联系单\业务联系单接口文档.md`
- 后端变更：`D:\code\Freight\aspnet-core\文档\业务联系单\业务联系单-2026-07-14.md`
- 客户选择：`apps/web-antd/doc/客户/客户通用文档.md`
- 付费申请活文档：`apps/web-antd/doc/modules/fee-management/payment-application.md`
- 海运出口服务流程 PRD：`apps/web-antd/doc/prd/sea-export-service-flow-prd.md`
- 列表表单规范：`.cursor/rules/web-antd-list-form-conventions.mdc`
