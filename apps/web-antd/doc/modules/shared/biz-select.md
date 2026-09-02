---
title: 业务选择组件
module: shared
author: 前端团队
last_updated: 2026-09-02
---

# 1. 业务背景说明 (Background)

**白话解释：** 业务选择组件统一封装客户、港口、船公司、币别、组织、用户等主数据选择能力，让页面不必重复处理分页检索、编辑回显和选项标签映射。

# 2. 功能与操作说明 (Features & Operations)

- **可编辑选择：** 通过下拉检索、分页加载或级联选择维护业务字段；关键词搜索默认 300ms 防抖后再打接口。
- **编辑回显：** 使用选项缓存、已选对象或详情接口，将业务 ID 还原为可读名称。`selectedItems` 可只带精简字段做关闭态 label；有关键词搜索时已选项不注入候选列表，完整展示依赖分页/详情数据，完整 option 不会被精简回显项覆盖。
- **禁用只读：** 组件整体 `disabled` 时保留名称解析能力，但以无边框、无箭头且垂直居中的纯文本外观展示；无值时显示 `-` 而非 placeholder。
- **归属组织录入（`MyOrgSelect`）：** 数据权限单据录入 `orgId` 专用下拉，选项来自本人**直属组织**（`use-my-org` 从 `GetMy.organizations` 派生），挂载时未选值自动填默认组织；区别于 `OrganizationSelect`（全量组织树，用于筛选/系统管理）。
- **指定用户所属组织（`UserOrgSelect`）：** 「先选人、再选该人所属组织」场景（如海出选定销售后选 `orgId`）；数据来自 `GetAllUserOrganizationsAsync` 全量缓存（`use-all-user-org`）；`userId` 变化时选项刷新，默认填该用户默认组织，越范围旧值自动清空。

# 3. 状态流转说明 (Status Transitions)

| 当前状态 | 触发人/动作 | 目标状态 | 状态说明 |
| :-- | :-- | :-- | :-- |
| 可编辑 | 页面权限或业务状态设为 `disabled` | 只读 | 禁止交互并隐藏控件装饰，仅展示已选内容 |
| 只读 | 页面恢复编辑权限 | 可编辑 | 恢复下拉、搜索、清除和级联操作 |

# 4. 核心字段说明 (Field Definitions)

| 字段名 | 📖 字段含义说明 | 🔌 数据来源 (接口/字典) | 🔗 联动规则 (依赖与触发) | 🛡️ 校验限制 (Validation) |
| :-- | :-- | :-- | :-- | :-- |
| **modelValue/value** | 当前选中的业务主键或主键数组 | 各业务主数据接口 | 由 options、selectedItems 或详情接口解析显示名称 | 雪花主键经 json-bigint 为 **string**，表单校验与提交须原样透传，禁止 `Number()` |
| **disabled** | 是否整体禁止编辑 | 页面权限或业务状态 | 为 `true` 时切换为只读文本外观 | 只控制交互和视觉，不替代后端权限 |
| **selectedItems** | 编辑回显对象（可精简字段，至少能解析 label） | 页面详情数据 | 无关键词时 pin 进选项缓存；有关键词时不注入候选列表；字段齐全的接口数据优先 | 分页选择组件按需传入；字段不齐时组件应拉详情补全 |
| **orgId (MyOrgSelect)** | 数据权限单据的归属组织 id | `GetMy.organizations` → `use-my-org` 直属组织 | 选中后可经 `getMyOrgCompanyNode` 派生本位币/税号/开票公司/公司银行账户 | 除客户/自动费用模板外**必填**；须为本人直属组织（后端完全相等校验） |
| **orgId (UserOrgSelect)** | 指定用户（如销售）的归属组织 id | `UserAdmin/GetAllUserOrganizationsAsync` → `use-all-user-org` | 依赖 `userId`；换人后选项刷新；可经 `getUserOrgCompanyNode(userId, orgId)` 取公司节点 | 须先有 `userId`；值为该用户直属组织 id |

# 5. 核心业务卡点 (Business Blockers)

> [!IMPORTANT] **[卡点 1：只读态不能直接显示 ID]** 多数业务选择值是主键，禁用态仍需保留原选项加载和标签解析流程，不能直接渲染 `modelValue`。

> [!IMPORTANT] **[卡点 2：雪花 ID 禁止转 number]** 超过 2^53-1 的 ID 在响应中为 string；关联表单不得使用 `z.number()` / `Number()`，否则校验失败或删改错记录。

> [!IMPORTANT] **[卡点 3：精简 selectedItems 不等于完整 option]** 仅传 id/名称时可用于关闭态回显，但不能当作下拉两行完整数据；搜索态不注入已选项，详情/分页完整数据优先，避免覆盖降级。

# 6. 变更与解析日志 (Changelog & Insights)

| 日期 | 变更类型 | 📝 业务功能变动 (针对工作流A) | 🤖 代码解析与架构洞察 (针对工作流B) |
| :-- | :-- | :-- | :-- |
| 2026-09-02 | `Fix` | `PortSelect` 按 EDI 回填时不再把五字码当港口 Id 去打详情。 | `ensureSelectedLoaded` 仅在 `valueKey=id` 时调 `DetailAsync`。详见 `changelogs/change-log-2026-09-02-port-select-edi-not-id.md`。 |
| 2026-08-05 | `Fix` | 分页下拉：搜索不固定注入已选项；完整 option 不被精简 selectedItems 覆盖；关键词搜索默认 300ms 防抖；PortSelect 字段不齐时仍拉详情补全。 | 收敛在 `usePagedSelect`（`completeValues` / `searchDebounce` / 搜索态不 restore pin）；`PortSelect.isDisplayComplete` 避免残缺回显阻断详情。详见 change-log-2026-08-05-paged-select-pin-search-debounce。 |
| 2026-07-12 | `Fix` | 港口/费用代码/汇率/客户账期等页面统一大数 ID 字符串校验与透传约定。 | 与 `request.ts` json-bigint `storeAsString` 对齐；biz-select 内 `parseIdToSafeString` 仅用于缓存键，不意味着表单可 coerce 为 number。 |
| 2026-07-12 | `Feature` | 所有 biz-select 在整体禁用时改为清晰的只读文本外观 | 保留底层 Select/Cascader 解析标签，统一通过 `biz-select` 样式标识收敛视觉行为 |
| 2026-07-22 | `Feature` | 新增 `MyOrgSelect` 归属组织录入下拉；配套 `use-my-org` 组合式，供全站数据权限单据录入 `orgId`。 | 多组织改造：`company/companyId`→`orgId/orgs`。`MyOrgSelect` 须在 `#/adapter/component` 顶层 barrel 再导出；公司信息取 `orgs` 内 `isCompany` 公司节点，展示归属组织名用末端节点。详见 change-log-2026-07-22-multi-org-orgid-refactor。 |
| 2026-07-26 | `Fix` | 禁用且无值的 biz-select 只读态显示 `-`，不再展示「请选择」等编辑态引导文案。 | 纯样式收敛：`biz-select-readonly.css` 中对 `.ant-select-selection-placeholder` 用 `visibility: hidden` + 可见 `::before` 输出 `-`，无需逐个组件改 placeholder。 |
| 2026-07-23 | `Feature` | 新增 `UserOrgSelect` + `use-all-user-org`：按指定用户取其所属组织下拉，对接 `GetAllUserOrganizationsAsync`。 | 与 `MyOrgSelect` 对称：本人组织走 userStore/`GetMy`，他人组织走全量用户组织缓存；组件须顶层 barrel 再导出。详见 change-log-2026-07-23-user-org-select。 |
