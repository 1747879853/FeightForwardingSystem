---
title: 运价查询
module: 航线管理
author: auto-doc-sync
last_updated: 2026-09-11
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
| 关键源码 | `src/router/routes/modules/freight-rate.ts`<br/>`src/views/freight-rate/list.vue`<br/>`src/views/freight-rate/data.ts`<br/>`src/api/sea-export/freight-rate-admin.ts` |
| 列持久化 tableId | 列表 `FreightRateList`；批量编辑 `FreightRateBatchEdit`；批量新增 `FreightRateBatchAdd`（经 `gridOptions.id` 注入，常量见 `data.ts`） |

# 2. 功能与操作说明 (Features & Operations)

- **运价查询：** 按航线、港口、船公司、箱型等维度检索运价。有效状态默认「已生效 + 未生效」；关闭 `autoLoad`，挂载后 `submitForm` 首查，保证默认值写入「最近提交值」（切航线 Tab / 翻页 / 刷新不丢）。
- **搜索项设置：** 可通过列表工具栏入口调整搜索字段的显示与顺序，设置弹层显示在工具栏下方。
- **列配置持久化：** 列表与批量新增/编辑弹窗表格各自在 `gridOptions.id` 声明独立 id，列显隐/顺序/固定/列宽互不覆盖。
- **航线 Tab 筛选：** 列表工具栏左侧展示「全部 + 各航线」Tab；超出可视区域时可点击左右箭头平滑滚动浏览，并与右侧操作按钮保持固定间距。
- **运价维护：** 通过运价表单或弹窗维护费率明细。
- **批量新增：** 列表页打开批量新增弹窗，支持一次新增多行运价；新增/复制行采用批量 `loadData` 插入并显示 loading，减少多行插入卡顿。
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
