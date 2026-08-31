---
title: 空运出口新建
module: 空运出口
author: auto-doc-sync
last_updated: 2026-08-31
---

# 1. 业务背景说明 (Background)

**白话解释：** 录入一票空运出口委托，一次性写入业务主表、空运扩展表和货物明细、商品、干系人三张子表。

**路由与源码定位：**

| 项目 | 内容 |
| :-- | :-- |
| 页面路由 | `/air-exports/create` |
| 路由名称 | `AirExportCreate` |
| 页面组件 | `src/views/air-export-admin/basic-info-form/form.vue` |
| 权限口径 | `Admin.AirExport`（新增 `Admin.AirExport.Create`） |
| 关键源码 | `src/views/air-export-admin/basic-info-form/use-air-export-submit.ts`<br/>`src/views/air-export-admin/basic-info-form/air-export-detail-mapper.ts`<br/>`src/views/air-export-admin/modules/air-export-order-ctn-table.vue`<br/>`src/views/air-export-admin/data.ts`<br/>`src/views/air-export-admin/basic-info-form/use-air-export-ai-recognize.ts` |

# 2. 功能与操作说明 (Features & Operations)

- **基础信息：** 委托编号/会计期间/应结日期只读；归属组织与业务来源内联在区块头部；委托单位必填。
- **相关方：** 发货人、收货人、通知人及各自内容；收发通为灰色折叠条，点击展开/收起，**默认展开**（`v-show` 不销毁表单）。右侧独立面板维护干系人。
- **航段信息：** 起运地 → 中转地 → 目的地三段，各带备注；选中空港后输入框回显三字码，备注自动回填英文名称，可手改；航班与订舱代理内联在「航段信息」标题右侧。
- **日期信息：** 货好时间 → 送仓日期 → 报关日期 → 起飞日期 → 实际起飞日期 → 预抵日期。
- **货物信息：** 从左到右为唛头货描、件重尺（含泡比）、内外部备注（顶部 Tab 切换，多行 textarea 撑满卡片）；件数与包装合并为一行（`PkgsPackageInput`，比例 1:3）；货物类型切换危险品区/冻柜区（超限箱不展示任何扩展区）；毛重或体积变化时重算泡比。
- **货物明细：** 可增删行、上下移动，体积/体积重/计费重自动带出且允许手改。
- **保存：** 校验通过后新建并跳转编辑页，同时刷新列表与工作台。
- **AI识别：** 顶栏上传空运单证（PDF/图片/Office/OFD），调用 `TextInAdmin/ExtractAirExportToAddDtoAsync` 预填表单；空港走机场下拉；货物明细写入 `airExportOrderCtns`；用户校对后再点保存走 `AirExportAdmin/AddAsync`。
- **打印：** 顶栏有「打印」按钮，新建未保存时提示先保存；真正打印在跳转编辑页后按已保存 id 取数。

# 3. 状态流转说明 (Status Transitions)

| 当前状态 | 触发人/动作 | 目标状态 | 状态说明 |
| :-- | :-- | :-- | :-- |
| 空白表单 | 用户填写并保存 | 编辑页 | 保存成功后重置脏检查基线再跳转，避免触发未保存拦截。 |
| 空白/已填表单 | 用户 AI 识别单证 | 预填后可改 | 只覆盖识别到的非空字段；保存仍走 `AddAsync`。 |
| 表单有改动 | 用户离开路由 | 二次确认 | 由 `useUnsavedGuard` + DTO 快照比对判定。 |

# 4. 核心字段说明 (Field Definitions)

| 字段名 | 📖 字段含义说明 | 🔌 数据来源 (接口/字典) | 🔗 联动规则 (依赖与触发) | 🛡️ 校验限制 (Validation) |
| :-- | :-- | :-- | :-- | :-- |
| **业务来源** | 订单业务来源分类；头部可下拉，选项来自基础资料业务来源。 | `transportOrder.codeSourceId` / `codeSource`；`CodeSourceSelect` | **触发/依赖：** 头部选择写回隐藏字段 `codeSourceId`；**不**随委托单位自动带出（与海出不同）。 | 可选，允许清空。 |
| **委托单位** | 委托方客户主体。 | `ClientSelect`（行业类别 `p`） | **触发/依赖：** 影响账期与后续费用链路。 | **必填**，否则后端报「委托单位不存在」。 |
| **归属组织** | 数据归属组织。 | `UserOrgSelect`（按销售取直属组织） | **触发/依赖：** 切换销售会清空已选组织并重载列表。 | **必填**，且必须是该销售的**直属**组织，父组织不算。 |
| **干系人-销售** | 该票销售。 | `UserSelect`（`UserAttribute=16`） | **触发/依赖：** 决定归属组织候选范围。干系人下拉按当前用户各公司或所选组织所属公司过滤。 | **有且只能有一个**，0 个和 2 个都报同一句。 |
| **航班** | 航班号自由文本。 | `AirExport.flightNo` | **触发/依赖：** 内联在航段标题右侧，不占港口栅格。 | 不必填。 |
| **订舱代理** | 国内订舱代理往来单位。 | `ClientSelect`（行业类别 `o`） | **触发/依赖：** 与航班同处标题栏；详情回填走 header 表单 `selectedItems`。 | 不必填。 |
| **起飞日期 ETD** | 航班起飞日期。 | `transportOrder.etd` | **触发/依赖：** 驱动后端计算会计期间与应结日期。 | 不必填；为空时会计期间按当前时间算。 |
| **内部备注 / 外部备注** | 货物区右侧同一卡片，顶部 Tab 切换；内部仅内部可见；多行 textarea 撑满卡片高度。 | `transportOrder.internalRemark` / `transportOrder.remark` | **触发/依赖：** 两字段同时挂在 `CargoRemarkForm`，用 CSS 隐藏非当前 Tab，切换不丢未保存内容。 | 可选，最长 1024。 |
| **泡比** | 整票毛重 ÷ 整票体积。 | 前端计算，存 `bubbleRatio` | **触发/依赖：** 毛重或体积变化时重算。 | 体积为空或 0 时**留空（null）**，不要存 0。 |
| **明细-体积(单件)** | 长 × 宽 × 高 ÷ 1000000。 | 前端计算 | **触发/依赖：** 长/宽/高任一变化即重算，并向下传导。 | 任一为空则留空，6 位小数。 |
| **明细-体积重(整行)** | 单件体积 × 167 × 件数。 | 前端计算 | **触发/依赖：** 体积或件数变化即重算，并向下传导计费重。 | 体积或件数为空则留空。 |
| **明细-计费重(整行)** | max(体积重, 单件重量 × 件数) 后按 0.5 千克向上进位。 | 前端计算；AI 识别时以后端已算值为准 | **触发/依赖：** 体积重、重量、件数任一变化即重算。识别整表回填时不立刻重跑公式。 | 两者都算不出则留空。 |
| **AI识别** | 上传单证预填新建表单，结果可改，不是终值。 | `TextInAdmin/ExtractAirExportToAddDtoAsync` | **触发/依赖：** 回填 `airExport`；空港匹配 `AirPort`；航司原文仅在 `extract.extractedSchema["航空公司"]`。 | 匹配不到 id 不报错；空 Guid 委托单位必填拦截；须补销售恰好 1 个与 `orgId`。 |

# 5. 核心业务卡点 (Business Blockers)

> [!IMPORTANT] **[卡点 1：明细行单件值与合计值混在一起]** 件数、重量、长宽高、体积是「单件」值，体积重与计费重是「整行合计」值，表头必须保留单位标注，否则运费会差几十倍。

> [!IMPORTANT] **[卡点 2：派生值不会自动跟随基准值变化]** 用户改了基准值却未触发前端计算时，保存的仍是旧值，后端不会纠正——既定行为，不是缺陷。

> [!IMPORTANT] **[卡点 3：委托编号规则是硬前置]** `AirExport.CommissionNum` 未配置时，用户不手填编号就直接报「未配置生成规则」。

> [!IMPORTANT] **[卡点 4：子表全量提交]** 货物明细、商品、干系人做全量比对，漏传的行会被删除。

> [!IMPORTANT] **[卡点 5：AI 识别只是预填]** 空港必须用机场下拉回显；货物明细不要写进 `transportOrder.orderCtns`；识别后须用户校对再保存。

# 6. 变更与解析日志 (Changelog & Insights)

| 日期 | 变更类型 | 📝 业务功能变动 (针对工作流A) | 🤖 代码解析与架构洞察 (针对工作流B) |
| :-- | :-- | :-- | :-- |
| 2026-08-31 | `Fix` | 主单毛重/体积、货物明细单件重量/体积改为最多 4 位小数，末尾 0 不展示；长宽高/体积重/计费重/泡比仍 6 位。 | TAPD `#1161580498001000905`。与编辑页共用 schema。详见 `changelogs/change-log-2026-08-31-weight-volume-4-decimal.md`。 |
| 2026-08-23 | `Feature` | 新建页接入未保存守卫并 KeepAlive。 | `keepAliveName: AirExportAdminForm`。详见 `changelogs/change-log-2026-08-23-detail-keep-alive-unsaved.md`。 |
| 2026-08-23 | `Feature` | 顶栏增加「打印」按钮（与编辑页共用 `form.vue`）。 | 新建未保存会拦截；详见 `changelogs/change-log-2026-08-23-air-export-print.md`。 |
| 2026-08-19 | `Feature` | 干系人下拉改为全量用户缓存；未选归属组织时看当前用户各公司，选了组织后看该销售组织所属公司。客户默认干系人仍带回且显示昵称。 | 与编辑页共用 `form.vue` 的 `company-ids`。详见 `changelogs/change-log-2026-08-19-user-select-full-cache-company-filter.md`。 |
| 2026-08-18 | `Feature` | 新建/编辑基础信息顶栏增加 AI 识别，上传单证后预填表单。 | 走 `TextInAdmin/ExtractAirExportToAddDtoAsync`；空港回显 `AirPort`；货物明细写 `airExportOrderCtns`。详见 `changelogs/change-log-2026-08-18-air-export-textin-ai-extract.md`。 |
| 2026-08-17 | `Fix` | 选中空港后输入框只回显三字码，备注回填英文名称。 | `labelKey=iataCode`；备注走 `formatAirPortRemark`。详见 `changelogs/change-log-2026-08-17-air-export-airport-code-remark.md`。 |
| 2026-08-16 | `Feature` | 货物区内外部备注由单行改为多行 textarea，撑满备注卡片高度。 | `CargoRemarkForm` 组件改为 `Textarea`。详见 `changelogs/change-log-2026-08-16-air-export-sea-import-remark-textarea.md`。 |
| 2026-08-16 | `Feature` | 件数与包装合并为一行，交互对齐海运进口。 | `PkgsPackageInput`；`codePackageId` 隐藏落库。详见 `changelogs/change-log-2026-08-16-air-export-pkgs-package-row.md`。 |
| 2026-08-16 | `Feature` | 收发通改为灰色折叠条（默认展开）；内部/外部备注挪到货物区件重尺右侧，顶部 Tab 切换，样式对齐海运进口。 | 折叠与 Tab 均用 `v-show` / CSS 隐藏，勿 `v-if`。详见 `changelogs/change-log-2026-08-16-air-export-party-collapse-remark-tabs.md`。 |
| 2026-08-16 | `Refactor` | 航班与订舱代理从航段流程条下方挪到「航段信息」标题右侧。 | 见 `changelogs/change-log-2026-08-16-air-export-leg-header-fields.md`。 |
| 2026-08-16 | `Fix` | 头部业务来源改为可下拉选择，新建与编辑均可再改或清空。 | 见 `changelogs/change-log-2026-08-16-sea-import-air-export-code-source-select.md`。 |
| 2026-08-05 | `Feature` | 新建空运出口录入表单：五个分区、干系人面板、危险品/冻柜联动、货物明细可编辑表格与四个派生值计算。 | 四个派生值集中在 `air-export-detail-mapper.ts` 内的纯函数（`calcCtnCbm` / `calcVolumeWeight` / `calcChargeWeight` / `calcBubbleRatio`），表格与表单共用；DTO 组装保持 `airExportOrderCtns` 挂在空运出口层而非 `transportOrder`；业务锁定无 schema 字段，用独立 ref 承载以免编辑保存时被清空。 |
