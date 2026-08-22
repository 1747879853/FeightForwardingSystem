---
title: 船公司资料
module: 基础资料
author: auto-doc-sync
last_updated: 2026-08-22
---

# 1. 业务背景说明 (Background)

**白话解释：** 船公司/承运人基础资料，为委托和运价提供承运主体。

**路由与源码定位：**

| 项目 | 内容 |
| :-- | :-- |
| 页面路由 | `/basic-data/carrier` |
| 路由名称 | `BasicDataCarrier` |
| 页面组件 | `src/views/system/basic-data/CarrierAdmin/list.vue` |
| 权限口径 | Admin.Carrier / Admin.Carrier.Get |
| 关键源码 | `src/router/routes/modules/basic-data.ts`<br/>`src/views/system/basic-data/CarrierAdmin/list.vue`<br/>`src/views/system/basic-data/CarrierAdmin/data.ts`<br/>`src/views/system/basic-data/CarrierAdmin/modules/form.vue`<br/>`src/api/system/base-data/carrier-admin.ts` |

# 2. 功能与操作说明 (Features & Operations)

- **列表维护：** 在 `船公司资料` 页面查询、创建、编辑和删除基础资料。列表**不做展开行**，堆场只在抽屉里看和改。
- **抽屉表单：** `CarrierAdmin/modules/form.vue` 为 Drawer（对齐商品信息），主表字段与 Logo 上传在上，下方维护「堆场」可增删行表格（名称、地址、备注）。Logo 为单图 `picture-card`，上传后直接显示缩略图，不列文件名；换图需先删除再上传。
- **堆场子表：** 随主表一次提交 `carrierYards`；编辑为全量覆盖（保留行带 `id`、新增 `id: null`、删除行从数组移除）；**子表不传 `sortId`**，顺序由行顺序决定。监装工单的「监装堆场」下拉即取自本子表。
- **业务复用：** 基础资料作为业务下拉、字典或校验来源被其他模块引用。

# 3. 状态流转说明 (Status Transitions)

| 当前状态 | 触发人/动作  | 目标状态 | 状态说明                           |
| :------- | :----------- | :------- | :--------------------------------- |
| 页面初始 | 用户进入路由 | 页面可用 | 由动态路由与权限守卫完成组件挂载。 |

# 4. 核心字段说明 (Field Definitions)

| 字段名 | 📖 字段含义说明 | 🔌 数据来源 (接口/字典) | 🔗 联动规则 (依赖与触发) | 🛡️ 校验限制 (Validation) |
| :-- | :-- | :-- | :-- | :-- |
| **cnName / cnShortName / enName / code** | 船公司中英文名称与代码标识。 | `src/views/system/basic-data/CarrierAdmin/data.ts` | **触发/依赖：** 被运价、委托等下游选择器复用。 | 由表单长度限制与后端必填规则共同约束。 |
| **logo** | 船公司 Logo 附件（单图，缩略图预览）。 | `src/views/system/basic-data/CarrierAdmin/data.ts`<br/>`src/views/system/basic-data/CarrierAdmin/modules/form.vue`<br/>`src/api/system/base-data/carrier-admin.ts` | **触发/依赖：** `FileUploadInput` 使用 `listType: 'picture-card'`；上传后取 `attachmentId`，提交为 `logo.attachmentId`。无值时传 `null` 可清空。 | 限制为图片类型、**仅 1 张**、≤5MB。 |
| **remark / otherCode / ediCode** | 业务补充说明与扩展编码信息。 | `src/views/system/basic-data/CarrierAdmin/data.ts` | **触发/依赖：** 用于检索和业务识别补充。 | 文本长度受前端与后端共同限制。 |
| **carrierYards（堆场）** | 该船公司下的堆场，含名称与地址。 | `CarrierAdmin` 列表/详情随主表返回，按 `sortId` 升序 | **触发/依赖：** 监装工单按已保存 `carrierId` 取本子表作为堆场下拉源。 | 名称**必填**、最长 128、同船公司下不重名（去空格、忽略大小写）；地址最长 512；备注最长 1024。 |

# 5. 核心业务卡点 (Business Blockers)

> [!IMPORTANT] **[卡点 1：船公司资料一致性]** 基础资料页面同质性高，但字段变更会影响大量业务下拉，需谨慎维护编码和启用状态。

> [!IMPORTANT] **[卡点 2：编辑须同时带 Logo 与全量堆场]** 提交漏传 `logo` 会清空 Logo，漏传已有堆场会被后端删除。删除船公司会级联删除堆场与 Logo 附件。

> [!IMPORTANT] **[卡点 3：内嵌 carrier 对象无堆场]** 海运运价等处内嵌的 `carrier.carrierYards` 恒为 `null`（不是 `[]`），取值必须判空；需要堆场请单独调船公司详情。

# 6. 变更与解析日志 (Changelog & Insights)

| 日期 | 变更类型 | 📝 业务功能变动 (针对工作流A) | 🤖 代码解析与架构洞察 (针对工作流B) |
| :-- | :-- | :-- | :-- |
| 2026-08-22 | `Feature` | Logo 改为单图缩略图卡片：上传后直接看图，不再显示文件名。 | 对齐组织 Logo：`listType: 'picture-card'` + `maxCount: 1`。`FileUploadInput` 在 picture-card 下隐藏文件名列表；回显无扩展名时仍弹窗预览。详见 `changelogs/change-log-2026-08-22-carrier-logo-picture-card.md`。 |
| 2026-08-22 | `Feature` | 新增「堆场」子表（名称/地址/备注）；表单由 Modal 改 Drawer；列表不做展开行。 | TAPD #1000122 监装前置改造。子表 `sortId` 后端按数组下标生成；编辑须同时带 `logo` 与全量堆场。详见 `changelogs/change-log-2026-08-22-loading-supervision-frontend.md`。 |
| 2026-05-30 | `Feature` | 基础资料列表路由统一开启 `keepAlive`；弹窗新增/编辑/删除成功后 `@success` 或 `handleRefresh` 即时刷新。 | 弹窗型列表无需 `onActivated`；全模块约定见 [列表页 keepAlive 与刷新约定](../../guides/list-page-keepalive-refresh.md)。 |
| 2026-05-19 | `Feature/Fix` | 船公司列表与船公司下拉的 Logo 地址统一改为全局附件拼接方法，按 `VITE_GLOB_API_URL` 去掉 `/api` 后拼接，避免不同域名场景下图片回显失败。 | 将附件/Logo 地址拼接规则集中到 `attachment-url` 工具，减少业务页散落拼接逻辑。 |
| 2026-05-17 | `Feature/Fix` | 将 `CarrierAdmin` 所有前端 API 路径统一恢复为 `Async` 后缀（GetPagedList/Detail/Add/Edit/Delete），避免路由不匹配。 | 字段协议（logo、分页参数）与接口命名后缀是独立维度，本次仅修正路由命名，不回退 DTO 对接。 |
| 2026-05-17 | `Feature/Fix` | `/basic-data/carrier` 对接新版 `CarrierAdmin` 协议：移除 `countryId`，新增 `logo` 上传与提交；列表增加 Logo 文件名展示。 | 船公司 API 分页参数按 Swagger 对齐为 `Keyword/.../PageIndex/PageSize`，并同步影响 `carrier-select` 与海运出口运价模块对船公司下拉的分页调用。 |
| 2026-05-16 | `Parsing` | 无 | 按 `src/router/routes/modules` 动态路由与页面源码重建文档；页面 `/basic-data/carrier` 对应组件 `src/views/system/basic-data/CarrierAdmin/list.vue`，权限口径为 Admin.Carrier / Admin.Carrier.Get。 |
