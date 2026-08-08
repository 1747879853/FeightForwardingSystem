---
title: 海运进口新建
module: 海运进口
author: auto-doc-sync
last_updated: 2026-08-04
---

# 1. 业务背景说明 (Background)

**白话解释：** 创建新的海运进口委托单，提交成功后进入编辑工作台继续维护费用和子业务。版式与海运出口基础信息页对齐。

**路由与源码定位：**

| 项目 | 内容 |
| :-- | :-- |
| 页面路由 | `/sea-imports/create` |
| 路由名称 | `SeaImportCreate` |
| 页面组件 | `src/views/sea-import-admin/basic-info-form/form.vue` |
| 权限口径 | `Admin.SeaImport` |
| 关键源码 | `src/router/routes/modules/operation-management.ts`<br/>`src/views/sea-import-admin/list.vue`<br/>`src/views/sea-import-admin/basic-info-form/form.vue`<br/>`src/views/sea-import-admin/editor.vue`<br/>`src/views/sea-import-admin/data.ts`<br/>`src/api/sea-import/sea-import-admin.ts` |

# 2. 功能与操作说明 (Features & Operations)

- **基础信息录入：** 中间主表单按出口骨架分区（基础信息 / 相关方 / 船期 / 港口 / 货物），右侧干系人面板。
- **进口作业日期：** 到港日期可改；转站、箱使为只读文本，由到港日期与免箱期推算；免箱期在船期标题旁编辑。
- **干系人：** 销售角色必填且唯一；右侧卡片式增删角色，与归属组织联动。
- **提交创建：** 校验通过后调用新增接口，成功跳转编辑页。

# 3. 状态流转说明 (Status Transitions)

| 当前状态 | 触发人/动作  | 目标状态 | 状态说明                           |
| :------- | :----------- | :------- | :--------------------------------- |
| 页面初始 | 用户进入路由 | 页面可用 | 由动态路由与权限守卫完成组件挂载。 |

# 4. 核心字段说明 (Field Definitions)

| 字段名 | 📖 字段含义说明 | 🔌 数据来源 (接口/字典) | 🔗 联动规则 (依赖与触发) | 🛡️ 校验限制 (Validation) |
| :-- | :-- | :-- | :-- | :-- |
| **到港日期 (`etd`)** | 界面「到港日期」，落库 `transportOrder.etd`。 | `data.ts` / 详情扁平化 | **触发：** 重算转站日期、箱使日期。 | 可手选。 |
| **转站/箱使日期** | 推算结果，只读文本。 | 到港 +9 天；到港 + 免箱期 −1 | **触发/依赖：** 到港、免箱期变化时写入 `YYYY-MM-DD`。 | 不可手改。 |
| **原产国** | 整票属性。 | `CountrySelect` | 放在基础信息「运输条款」之后。 | 可选。 |
| **净重合计** | 货物区净重。 | 箱型行 `netWeight` 求和 | 箱型变动自动回填，可二次手改。 | 详情回填时挂起自动求和。 |
| **干系人** | 订单协同角色。 | `use-order-users.ts` | 右侧面板；销售必填且唯一。 | 保存前校验销售与必填角色人员。 |

# 5. 核心业务卡点 (Business Blockers)

> [!IMPORTANT] **[卡点 1：海运进口新建一致性]** 新建页只负责建立业务主记录，不应承载编辑态才可进行的费用审核、锁费和结算动作。

# 6. 变更与解析日志 (Changelog & Insights)

| 日期 | 变更类型 | 📝 业务功能变动 (针对工作流A) | 🤖 代码解析与架构洞察 (针对工作流B) |
| :-- | :-- | :-- | :-- |
| 2026-08-08 | `Fix` | 新建表单去掉订舱编号字段。 | 与编辑页同源 Schema；详见 `changelogs/change-log-2026-08-08-sea-import-remove-booking-num.md`。 |
| 2026-08-04 | `Feat` | 按海运出口版式重建新建表单：流程条布局、转站/箱使只读推算、免箱期标题旁编辑、原产国入基础信息、净重随箱型合计、唛头货描与右侧 CBM 底对齐。 | 组件迁至 `basic-info-form/form.vue`；进口无服务项目流水线，干系人复用出口面板逻辑并去掉服务绑定校验。 |
| 2026-06-07 | `Refactor` | 服务项目勾选与提交不再依赖写死 `0~4` 数值，统一从 `getEnumItems('ServiceType')` 解析后参与 `serviceTypes` 组装。 | 海运进口表单与海运出口共用 ServiceType 枚举加载能力，确保两端服务项值口径一致。 |
| 2026-05-17 | `Fix` | 修复干系人补录场景：新增角色后角色下拉保持可用，仅禁用重复角色选项，支持在缺失角色中手动选择。 | 无 |
| 2026-05-17 | `Fix` | 干系人固定角色（销售/商务/操作/客服/单证）改为不可删除、不可重复添加；提交前新增“销售与操作必须选择人员”校验。 | 无 |
| 2026-05-16 | `Parsing` | 无 | 按 `src/router/routes/modules` 动态路由与页面源码重建文档；页面 `/sea-imports/create` 对应组件 `src/views/sea-import-admin/form.vue`，权限口径为 未在路由中声明独立权限。 |
