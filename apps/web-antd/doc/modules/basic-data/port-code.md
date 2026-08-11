---
title: 港口代码
module: 基础资料
author: auto-doc-sync
last_updated: 2026-08-12
---

# 1. 业务背景说明 (Background)

**白话解释：** 维护港口资料，支撑起运港、目的港、卸货港等字段。

**路由与源码定位：**

| 项目 | 内容 |
| :-- | :-- |
| 页面路由 | `/basic-data/port-code` |
| 路由名称 | `BasicDataPortCode` |
| 页面组件 | `src/views/system/basic-data/PortCodeAdmin/list.vue` |
| 权限口径 | Admin.PortCode / Admin.PortCode.Get |
| 关键源码 | `src/router/routes/modules/basic-data.ts`<br/>`src/views/system/basic-data/PortCodeAdmin/list.vue`<br/>`src/views/system/basic-data/PortCodeAdmin/data.ts`<br/>`src/views/system/basic-data/PortCodeAdmin/modules/form.vue`<br/>`src/api/system/base-data/port-code-admin.ts` |

# 2. 功能与操作说明 (Features & Operations)

- **列表维护：** 在 `港口代码` 页面查询、创建、编辑和删除基础资料。检索支持港口查询（中英文名）、航线中文名、EDI 代码、国家名称与状态；列表展示创建人。默认按国家中文名升序；列头远程排序仅开放后端可排字段（本表 + `Country.*` / `Lane.*`），创建人昵称不可排。
- **弹窗表单：** 多数基础资料通过 `PortCodeAdmin/modules/form.vue` 维护明细。
- **业务复用：** 基础资料作为业务下拉、字典或校验来源被其他模块引用。

# 3. 状态流转说明 (Status Transitions)

| 当前状态 | 触发人/动作  | 目标状态 | 状态说明                           |
| :------- | :----------- | :------- | :--------------------------------- |
| 页面初始 | 用户进入路由 | 页面可用 | 由动态路由与权限守卫完成组件挂载。 |

# 4. 核心字段说明 (Field Definitions)

| 字段名 | 📖 字段含义说明 | 🔌 数据来源 (接口/字典) | 🔗 联动规则 (依赖与触发) | 🛡️ 校验限制 (Validation) |
| :-- | :-- | :-- | :-- | :-- |
| **countryId / laneId** | 港口所属国家与航线。 | `CountrySelect` / `LaneSelect`<br/>`country-code-admin` / `lane-code-admin` | **触发/依赖：** 列表大洲列取自关联国家 `country.chau`；检索区亦可按国家/航线筛选。 | **必填**（表单）；大数 ID 经 json-bigint 为 string，校验与提交均原样透传，禁止 `Number()`。 |
| **港口查询 Keyword** | 按港口中英文名称模糊检索。 | `PortCodeAdmin/GetPagedListAsync` | 文案为「港口查询」；参数名仍为 `Keyword`。 | 可选。 |
| **创建人** | 资料创建人昵称。 | 列表 `creatorUserName` | 依赖后端列表 DTO 回填；列头不可排序。 | 只读。 |
| **列表排序 Sorting** | 远程列头排序参数。 | `createPagedListQuery` → `GetPagedListAsync` | 默认 `Country.CountryName ASC`；国家/大洲/航线列经 `sortField` 映射到 `Country.*`/`Lane.*`。 | 仅实体及导航可排字段。 |
| **编码** | 基础资料唯一或半唯一识别字段。 | `src/views/system/basic-data/PortCodeAdmin/data.ts` | **触发/依赖：** 被业务单据或下拉组件引用。 | 唯一性和格式以后端为准。 |
| **名称** | 给业务用户识别的显示值。 | `src/views/system/basic-data/PortCodeAdmin/data.ts` | **触发/依赖：** 列表、表单、下拉组件共同展示。 | 通常不能为空。 |
| **启用状态** | 控制资料是否可被业务选择。 | `src/api/system/base-data/*.ts` | **触发/依赖：** 禁用后不应继续作为新业务选择项。 | 历史单据展示需兼容旧值。 |

# 5. 核心业务卡点 (Business Blockers)

> [!IMPORTANT] **[卡点 1：港口代码一致性]** 基础资料页面同质性高，但字段变更会影响大量业务下拉，需谨慎维护编码和启用状态。

> [!IMPORTANT] **[卡点 2：大数 ID 精度]** 国家/航线主键超过 2^53-1 时，接口响应为 string；编辑切换下拉后不得用 `z.number()` 校验或 `Number()` 提交，否则校验失败或 ID 变错。

# 6. 变更与解析日志 (Changelog & Insights)

| 日期 | 变更类型 | 📝 业务功能变动 (针对工作流A) | 🤖 代码解析与架构洞察 (针对工作流B) |
| :-- | :-- | :-- | :-- |
| 2026-08-12 | `Feature` | 列表列头排序对齐港口本表及 Country/Lane 导航可排字段；默认按国家中文名升序；创建人列关闭排序。 | `defaultSort: Country.CountryName ASC`；国家列 field 用 `country.countryName`；大洲/航线 `sortField` 映射；详见 `changelogs/change-log-2026-08-12-port-code-list-sortable-fields.md`。 |
| 2026-08-10 | `Feature` | 列表检索改为「港口查询」并增加航线/EDI/国家筛选；列表增加创建人列。 | 查询传 `Keyword`/`LaneId`/`EdiCode`/`CountryId`/`Status`；展示 `creatorUserName`。后端对齐见 `backend-tasks/port-code-admin-港口列表检索条件与创建人.md`。 |
| 2026-08-05 | `Fix` | `PortSelect`：精简 `selectedItems` 不再阻断详情补全；下拉两行缺字段时容错拼接；搜索不固定钉死已选项。 | 依赖公共 `usePagedSelect` 的 pin/搜索策略与 `complete` 合并；详见 change-log-2026-08-05-paged-select-pin-search-debounce。 |
| 2026-07-12 | `Fix` | 修复编辑港口切换国家/航线时报 `Expected number, received string`，并避免大数 ID 经 `Number()` 丢精度。 | `countryId`/`laneId` 用 `requiredSelectIdRule`（preprocess→string）；`normalizeSelectId` 提交透传；DTO 标注 `number \| string`。 |
| 2026-05-30 | `Feature` | 路由补充 `abpPageAuthority('Admin.PortCode')`，按模块权限控制页面访问。 | 与其他基础资料子路由一致，拥有模块或 `.Get` 权限即可进入。 |
| 2026-05-21 | `Fix` | 修复港口分页下拉在 `modelValue` 对应数据不在第一页时，详情已返回但最终 options 未包含该港口的问题。 | `port-select.vue` 通过详情接口合并已选港口，公共 `usePagedSelect` 需同步触发 `ApiComponent` 刷新其内部 options。 |
| 2026-06-27 | `Fix` | 港口新建/编辑表单移除「所在大洲」；列表该列改展示关联国家的 `country.chau`。 | 大洲归属国家资料，港口通过 `countryId` 间接关联，避免误填无效字段。 |
