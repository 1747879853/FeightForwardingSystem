---
title: 货物代码
module: 基础资料
author: auto-doc-sync
last_updated: 2026-08-16
---

# 1. 业务背景说明 (Background)

**白话解释：** 维护海运业务用的商品/品名（`CodeGoods`），供委托、箱表等选择；每个品名可配置一组规格、型号，供海运进口箱表下拉引用。

**路由与源码定位：**

| 项目 | 内容 |
| :-- | :-- |
| 页面路由 | `/basic-data/code-goods` |
| 路由名称 | `BasicDataCodeGoods` |
| 页面组件 | `src/views/system/basic-data/CodeGoodsAdmin/list.vue` |
| 权限口径 | Admin.CodeGoods / Admin.CodeGoods.Get |
| 关键源码 | `src/router/routes/modules/basic-data.ts`<br/>`src/views/system/basic-data/CodeGoodsAdmin/list.vue`<br/>`src/views/system/basic-data/CodeGoodsAdmin/data.ts`<br/>`src/views/system/basic-data/CodeGoodsAdmin/modules/form.vue`<br/>`src/api/system/base-data/code-goods-admin.ts` |

> 仓库品名 `GoodsInfo`（`GoodsInfoAdmin`）是另一模块，无规格/型号子表。

# 2. 功能与操作说明 (Features & Operations)

- **列表维护：** 按关键字、货物类型筛选；创建、编辑、删除品名。
- **弹窗表单：** 维护主表字段，并在下方维护规格/型号明细行（可增删）。
- **子表全量提交：** 编辑时保留行带 `id`、新增行 `id` 为 null、删除行直接从数组移除。
- **业务复用：** 海运进口箱表用品名详情的 `codeGoodsSpecs` / `codeGoodsModels` 作为规格/型号候选项。

# 3. 状态流转说明 (Status Transitions)

| 当前状态 | 触发人/动作  | 目标状态 | 状态说明                           |
| :------- | :----------- | :------- | :--------------------------------- |
| 页面初始 | 用户进入路由 | 页面可用 | 由动态路由与权限守卫完成组件挂载。 |

# 4. 核心字段说明 (Field Definitions)

| 字段名 | 📖 字段含义说明 | 🔌 数据来源 (接口/字典) | 🔗 联动规则 (依赖与触发) | 🛡️ 校验限制 (Validation) |
| :-- | :-- | :-- | :-- | :-- |
| **编码** | 品名编码。 | `CodeGoodsAdmin` | 列表/表单展示。 | 最长 128。 |
| **名称** | 品名显示名。 | `CodeGoodsAdmin` | 列表、下拉展示。 | **必填**，最长 128。 |
| **货物类型** | `cargoId`：普通货/冻柜/危险品/超限箱。 | 与业务单 CargoType 一致（0/1/2/3） | 列表列与筛选；新建/编辑必选。 | **必填**。 |
| **申报计量单位** | 海关申报用计量单位（`ruleUnit`）。 | `CodeGoodsAdmin` | 仅表单维护。 | 非必填，最长 64。 |
| **规格明细** | `codeGoodsSpecs`：名称、排序、备注。 | 详情/列表随主表返回，按 `sortId` 升序 | 编辑全量提交；被箱表引用不可删。 | 名称必填、同品名不重名（大小写不敏感），最长 128。 |
| **型号明细** | `codeGoodsModels`：字段同规格。 | 同上 | 同上 | 同上 |
| **启用状态** | 控制资料是否可被业务选择。 | `CodeGoodsAdmin` | 禁用后不应作为新业务选择项。 | 历史单据展示需兼容旧值。 |

# 5. 核心业务卡点 (Business Blockers)

> [!IMPORTANT] **[卡点 1：子表全量覆盖]** 编辑只提交部分规格/型号会导致未提交行被后端删除。UI 必须回填并提交完整列表。

> [!IMPORTANT] **[卡点 2：箱表引用禁止删子表行]** 待删规格/型号若已被海运进口 `orderCtns` 选中，后端报「已被【业务委托单】的箱型引用,禁止删除」，整次编辑回滚；需先在业务单改选。

> [!IMPORTANT] **[卡点 3：品名被引用禁止删除]** 主表删除会级联删子表；若品名被业务委托单/分单/派车引用则禁止删除。

# 6. 变更与解析日志 (Changelog & Insights)

| 日期 | 变更类型 | 📝 业务功能变动 (针对工作流A) | 🤖 代码解析与架构洞察 (针对工作流B) |
| :-- | :-- | :-- | :-- |
| 2026-08-16 | `Feature` | 品名表单增加规格/型号子表与货物类型；编辑全量提交子表明细；列表支持货物类型筛选 | 无 |
| 2026-08-11 | `Fix` | 删除表单与 DTO 中的法定第一/第二计量单位（`ruleUnit1`/`ruleUnit2`），仅保留申报计量单位 `ruleUnit` | 无 |
| 2026-05-16 | `Parsing` | 无 | 按 `src/router/routes/modules` 动态路由与页面源码重建文档；页面 `/basic-data/code-goods` 对应组件 `src/views/system/basic-data/CodeGoodsAdmin/list.vue`，权限口径为 Admin.CodeGoods / Admin.CodeGoods.Get。 |
