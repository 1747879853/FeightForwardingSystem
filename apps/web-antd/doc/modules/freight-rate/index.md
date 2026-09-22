---
title: 运价查询
module: 航线管理
author: auto-doc-sync
last_updated: 2026-09-22
---

# 1. 业务背景说明 (Background)

**白话解释：** 维护海运运价信息，为委托费用测算和报价提供基础数据入口。侧边栏位于「航线管理」分组下（与「船期查询」并列），子菜单名称为「运价查询」，页面路由仍为 `/freight-rate`。

**路由与源码定位：**

| 项目 | 内容 |
| :-- | :-- |
| 页面路由 | `/freight-rate` |
| 路由名称 | `FreightRateList` |
| 页面组件 | `src/views/freight-rate/list.vue` |
| 权限口径 | `Admin.SeFreiPrice` / `Admin.SeFreiPrice.Get`（父级另聚合 `Admin.Schedule`） |
| 关键源码 | `src/router/routes/modules/freight-rate.ts`<br/>`src/views/freight-rate/list.vue`<br/>`src/views/freight-rate/batch-add-page.vue`<br/>`src/views/freight-rate/pending-batch-rows.ts`<br/>`src/views/freight-rate/modules/composables/useBatchAddColumnPersist.ts`<br/>`src/views/freight-rate/data.ts`<br/>`src/api/sea-export/freight-rate-admin.ts` |
| 列持久化 tableId | 列表 `FreightRateList`；批量编辑 `FreightRateBatchEdit`；批量新增 `FreightRateBatchAdd`（常量见 `data.ts`；Handsontable 经 `useBatchAddColumnPersist` 写入 `table_config_*`） |

# 2. 功能与操作说明 (Features & Operations)

- **列表派生文本刷新：** 中转港组合文案、开船日期、截单时间、截关时间和有效期使用函数插槽直接读取当前行，避免绑定字段不变时复用旧格式化文本；列键、排序、显隐、宽度和字段权限沿用原配置，导出取值同步。

- **字段权限展示：无条件受限列与筛选隐藏；条件受限单元格显示 `\***`；编辑表单按原始 DTO 缺 key 隐藏项目，费用受限格禁止编辑。\*\* 参见[通用适配说明](../../changelogs/change-log-2026-09-15-业务字段权限通用展示适配.md)。

- **运价查询：** 按航线、港口、船公司、箱型等维度检索运价。有效状态默认「已生效 + 未生效」；关闭 `autoLoad`，挂载后 `submitForm` 首查，保证默认值写入「最近提交值」（切航线 Tab / 翻页 / 刷新不丢）。
- **搜索项设置：** 可通过列表工具栏入口调整搜索字段的显示与顺序，设置弹层显示在工具栏下方。
- **列配置持久化：** 列表走 vxe `columnPersist`；批量新增/编辑 Tab 的 Handsontable 列显隐、顺序、固定通过齿轮「列配置」保存到同一套 `UserSetting`（`table_config_FreightRateBatchAdd` / `table_config_FreightRateBatchEdit`），与列表 key 互不覆盖。
- **默认可见列：** 有效时间起、是否有效、船公司、起运港、国家、目的港、开船日期、是否直达、中转港1、目的港免箱使天数、航程、箱型、备注、录入人、录入时间；其余默认隐藏。批量页无「国家/是否有效/录入人/录入时间」，目的港免箱使对应 DEM/DET/免箱使期；无用户配置时生效，已保存的列设置优先。
- **航线 Tab 筛选：** 列表工具栏左侧展示「全部 + 各航线」Tab；超出可视区域时可点击左右箭头平滑滚动浏览，并与右侧操作按钮保持固定间距。
- **运价维护：** 通过运价表单或弹窗维护费率明细。
- **批量新增 / 更新：** 列表「批量新增」「更新」「AI批量新增」打开独立 Tab（`/freight-rate/batch-add`、`/freight-rate/batch-edit`），行数据经 `pending-batch-rows` 内存传递；提交或取消后关 Tab 并刷新列表。菜单「批量更改」（多字段同步）仍为弹窗。
- **批量/同步：** 相关模块包含同步更新与箱型费用维护能力。

# 3. 状态流转说明 (Status Transitions)

| 当前状态 | 触发人/动作  | 目标状态 | 状态说明                           |
| :------- | :----------- | :------- | :--------------------------------- |
| 页面初始 | 用户进入路由 | 页面可用 | 由动态路由与权限守卫完成组件挂载。 |

# 4. 核心字段说明 (Field Definitions)

| 字段名 | 📖 字段含义说明 | 🔌 数据来源 (接口/字典) | 🔗 联动规则 (依赖与触发) | 🛡️ 校验限制 (Validation) |
| :-- | :-- | :-- | :-- | :-- |
| **航线/港口** | 运价适用范围。 | `src/views/freight-rate/data.ts` | **触发/依赖：** 影响委托匹配运价。 | 需选择有效基础资料。 |
| **箱型费用** | 不同箱型的费率明细。 | `freight-rate/modules/freight-rate-form.vue`（箱型费率区） | **触发/依赖：** 与运价主记录关联。 | 金额和币种需合法。 |
| **运价 API** | 运价后端契约。 | `src/api/sea-export/freight-rate-admin.ts` | **触发/依赖：** 列表、保存、同步更新均依赖该契约。 | 接口字段变化需同步文档。 |

# 5. 核心业务卡点 (Business Blockers)

> [!IMPORTANT] **[卡点 1：运价管理一致性]** 运价管理与海运出口业务耦合较强，更新费率时需确认是否影响历史委托或仅影响后续业务。

> [!IMPORTANT] **[卡点 2：首查须 `submitForm` 写入「最近提交值」]** 有效状态默认 `[0,1]`；切航线走 `gridApi.query`，必须先 `submitForm`。详见 `changelogs/change-log-2026-09-09-list-search-default-submit-form.md`。

# 6. 变更与解析日志 (Changelog & Insights)

| 日期 | 变更类型 | 📝 业务功能变动 (针对工作流A) | 🤖 代码解析与架构洞察 (针对工作流B) |
| :-- | :-- | :-- | :-- |
| 2026-09-22 | `Fix` | 修复运价列表列设置保存后查询/翻页被冲掉、看起来无法持久化的问题。 | 根因：`tableData` watch 每次 `setGridOptions({ columns })` 整表换列；改为仅箱型列集合变化时换列，并合并 `table_config_FreightRateList`。 |
| 2026-09-22 | `Feature` | 列表与批量页约定默认可见列白名单，其余列默认隐藏。 | `FREIGHT_RATE_LIST_DEFAULT_VISIBLE_FIELDS` / `FREIGHT_RATE_BATCH_DEFAULT_VISIBLE_FIELDS`；列表写 `visible:false`，批量无 UserSetting 时套用默认 Map。 |
| 2026-09-22 | `Feature` | 批量新增/更新 Tab 表格列配置（显隐/顺序/固定）可持久化记忆。 | `useBatchAddColumnPersist` 复用 `useTableConfigStore`；key 为既有 `FreightRateBatchAdd`/`FreightRateBatchEdit`；`syncHotTable` 回放用户配置。 |
| 2026-09-22 | `Refactor` | 批量新增、更新、AI 批量新增由弹窗改为独立 Tab 页编辑。 | 新增 `batch-add-page.vue`、`pending-batch-rows.ts`；路由 `FreightRateBatchAdd`/`FreightRateBatchEdit`；列表 `router.push` + `markListShouldRefresh`；「批量更改」仍为 `SyncUpdateModal`。 |
| 2026-09-20 | `Fix` | 修复中转港组合文案、开船日期、截单时间、截关时间和有效期刷新后可能显示旧值。 | 使用共享 `rowTextColumn` 函数插槽及导出取值，保留列配置；详见[变更记录](../../changelogs/change-log-2026-09-20-列表派生文本刷新.md)。 |
| 2026-09-11 | `Style` | 批量更改弹窗主色顶栏与分区卡片对齐新增/编辑风格；单层滚动防末段裁切。 | `sync-update-form.vue`。详见 `changelogs/change-log-2026-09-11-freight-rate-batch-update-form-polish.md`。 |
| 2026-09-11 | `Refactor` | 删除未接线弹窗；按功能重命名剩余 modules 组件。 | 删 `add-ctn`/`batch-edit`/旧 `batch-add`/旧 `sync-update`；`form`→`sync-update-form`，`*-handsontable`→`batch-add-modal`，`edit-form`→`freight-rate-form`，`column-config`→`batch-add-column-config-modal`。详见 `changelogs/change-log-2026-09-11-freight-rate-modules-cleanup-rename.md`。 |
| 2026-09-11 | `Style` | 新增/编辑弹窗附加费表：序号与费用基础/箱型价分区、条件态反馈。 | `freight-rate-form.vue`（原 `edit-form`）。详见 `changelogs/change-log-2026-09-11-freight-rate-edit-surcharge-table-polish.md`。 |
| 2026-09-11 | `Feature` | 批量新增列配置支持分区内拖拽排序，去掉上移/下移按钮。 | `column-config-modal.vue` + `sortablejs`。详见 `changelogs/change-log-2026-09-11-freight-rate-column-config-drag.md`。 |
| 2026-09-11 | `Style` | 批量新增弹窗主色顶栏与运价明细分区卡片对齐单条编辑风格。 | `batch-add-modal-handsontable.vue`。详见 `changelogs/change-log-2026-09-11-freight-rate-batch-add-modal-polish.md`。 |
| 2026-09-11 | `Refactor` | 运价列表清理死代码；复制改为编辑表单预填新增；厘清「更新」与「批量更改」入口。 | `list.vue` + `data.ts` + `edit-form` 的 `copyId`。详见 `changelogs/change-log-2026-09-11-freight-rate-list-cleanup.md`。 |
| 2026-09-11 | `Style` | 运价新增/编辑弹窗分区卡片与有效期横幅对齐系统风格。 | `edit-form.vue`：主色浅底横幅、图标标题栏、chip 模式切换、sticky 底栏。详见 `changelogs/change-log-2026-09-11-freight-rate-edit-form-polish.md`。 |
| 2026-09-11 | `Refactor` | 运价查询视图从海运出口目录抽出为独立模块。 | 页面迁至 `src/views/freight-rate/`；路由组件路径同步；API 仍在 `api/sea-export/freight-rate-admin.ts`。 |
| 2026-09-09 | `Fix` | 进入运价列表首查与切航线/翻页稳定带上有效状态默认「已生效+未生效」。 | `autoLoad: false` + `submitForm`；`mapParams` 对 `isValid === undefined` 兜底。详见 `changelogs/change-log-2026-09-09-list-search-default-submit-form.md`。 |
| 2026-07-26 | `Fix` | 列表、批量编辑、批量新增三表分别声明 `gridOptions.id`，避免同路由下列配置互相覆盖。 | 此前均回退为路由名 `FreightRateList`；常量集中在 `data.ts`，由 adapter 写入 `columnPersist.tableId`。 |
| 2026-07-16 | `Refactor` | 「航线管理」下并列「运价查询」「船期查询」；删除独立「船期管理」顶级菜单。 | 父级 `authority` 聚合 `Admin.SeFreiPrice`+`Admin.Schedule`；船期子路由绝对 path `/schedule`。 |
| 2026-07-12 | `Fix` | 修复点击「搜索项设置」后弹层被工具栏裁剪、看似无响应的问题。 | 工具栏允许溢出显示，航线 Tab 仍由自身容器负责横向裁剪与滚动。 |
| 2026-07-11 | `Refactor` | 侧边栏由独立「运价管理」改为「航线管理」分组下的「运价查询」子菜单；页面 path 与组件不变。 | `freight-rate.ts` 父级 `title` 为「航线管理」，`order: 190`；子路由 `FreightRateList` title 为「运价查询」。 |
| 2026-06-12 | `Feature` | 列表航线 Tab 靠左展示，超出时可左右滚动切换，且不再挤占右侧批量操作按钮。 | Tab 区与按钮区分 slot 布局；滚动动画期间只改 DOM，结束后再更新 Vue 滚动状态。 |
| 2026-06-12 | `Fix` | 批量新增弹窗一次新增多行时改为批量插入并增加 loading 反馈，减轻 10 行级卡顿。 | `insertRowsBatch` 合并 `getFullData` + `loadData` 替代循环 `insertAt`；复制行同步走同一路径。 |
| 2026-05-16 | `Parsing` | 无 | 按 `src/router/routes/modules` 动态路由与页面源码重建文档；页面 `/freight-rate` 对应组件 `src/views/freight-rate/list.vue`，权限口径为 未在路由中声明独立权限。 |
| 2026-09-15 | `Fix` | 进列表不再因字段权限包装层访问未挂载的 `formApi` 而白屏报错。 | `usePermissionGrid` 改写 `formOptions.schema`，`formApi.setState` 改为可选调用。详见 [变更日志](../../changelogs/change-log-2026-09-15-field-permission-grid-form-api.md)。 |
| 2026-09-15 | `Feature` | 字段权限展示：无条件受限列与筛选隐藏；条件受限单元格显示 `***`；编辑表单按原始 DTO 缺 key 隐藏项目，费用受限格禁止编辑。 | 显式模块配置、原始键结构快照及共享展示适配器。 |
