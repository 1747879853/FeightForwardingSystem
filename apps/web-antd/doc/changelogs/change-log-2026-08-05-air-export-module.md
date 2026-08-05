# 2026-08-05 新增空运出口模块（列表 / 表单 / 货物明细 / 只读费用 / 附件）

## 背景意图

后端已完成空运出口（`App_AirExports` + `App_AirExportOrderCtns`）建表与 11 个接口，前端需要按《空运出口模块总逻辑文档》《空运出口模块接口文档》落地整套业务页面。

空运出口与海运出口/进口共用业务主表 `App_TransportOrders`，因此以已重构过的 `sea-import-admin` 为版式与目录范式，只替换空运特有的数据结构与规则。

## 核心逻辑变更

### 新增文件

| 路径 | 作用 |
| :-- | :-- |
| `src/api/air-export/air-export-admin.ts` | 接口层与 DTO 定义（新增、编辑、详情、列表、分组、复制、删除、重新生成委托编号、附件三接口） |
| `src/views/air-export-admin/data.ts` | 列表列、搜索 schema、表单分区 schema、枚举与派生常量 |
| `src/views/air-export-admin/list.vue` | 列表页（筛选、分组统计、复制、删除） |
| `src/views/air-export-admin/editor.vue` | 编辑页标签容器（基础信息 / 只读费用 / 附件） |
| `src/views/air-export-admin/basic-info-form/form.vue` `form.css` | 主表单与样式 |
| `src/views/air-export-admin/basic-info-form/air-export-detail-mapper.ts` | 详情 ↔ 表单映射 + 四个派生值计算 |
| `src/views/air-export-admin/basic-info-form/use-air-export-submit.ts` | DTO 组装、校验编排、脏检查 |
| `src/views/air-export-admin/basic-info-form/use-order-users.ts` | 干系人面板（销售恰好 1 个） |
| `src/views/air-export-admin/modules/air-export-order-ctn-table.vue` | 货物明细可编辑表格 |
| `src/views/air-export-admin/orderFee/index.vue` | 只读费用总览 |
| `src/views/air-export-admin/attachments/index.vue` | 附件维护 |
| `src/views/air-export-admin/use-air-export-copy.ts` | 复制确认与跳转 |
| `src/locales/langs/{zh-CN,en-US}/airExport.json` | 文案 |

### 改动的既有文件

- `src/router/routes/modules/operation-management.ts`：新增 `/air-exports`、`/air-exports/create`、`/air-exports/:id/edit` 三条路由，权限口径 `Admin.AirExport`。
- `packages/icons/src/iconify/index.ts`：新增 `AirExportPlaneIcon`，与海运出口/进口的船图标区分。
- `src/adapter/component/biz-select/air-port-select.vue`：`labelKey` 新增 `'iataCnName'`，按「三字码/中文名」回显。
- `src/views/client/payment-terms/data.ts` 与 `seaExport.json`：账期业务类型新增「空运出口」（值 `2`）。

### 与海运的结构差异

1. **货物明细挂在扩展表**：`airExportOrderCtns` 的外键是 `AirExportId`，提交时放在空运出口这一层，不放进 `transportOrder`。业务主表的集装箱表空运完全不用。
2. **航段是三段**：起运地 → 中转地 → 目的地，各带一条备注；选中空港后自动把备注回填为「三字码/中文名」。没有航次、船名、船公司、航线、国家。
3. **日期语义**：界面的「起飞日期 / 实际起飞日期 / 预抵日期」分别落在 `etd` / `atd` / `eta`，`etd` 驱动会计期间与应结日期；报关日期、送仓日期后端原样保存，界面只录日期。
4. **四个派生值全部由前端算**：单件体积、整行体积重、整行计费重、票级泡比，后端只存不算也不校验。
5. **票级没有体积重/计费重合计字段**，列表列与明细表底部的合计都是界面自行相加得到。

## 避坑指南

- **明细行单位是混着的**：件数、重量、长宽高、体积是「单件」值，体积重与计费重是「整行合计」值。表头已按此标注，改列名时不要抹掉单位。
- **派生值不会自动跟随基准值变化**：改了长宽高/件数/重量/整票毛重体积却没触发前端计算，保存的就是旧值，后端不会纠正——这是既定行为。
- **泡比算不出来必须传 `null`**，不能退化成 `0`。
- **计费重要按 0.5 千克向上进位**：12.1 → 12.5、12.5 → 12.5、12.6 → 13。
- **子表全量比对**：货物明细、商品、干系人三张表漏传的行会被后端删除，编辑时必须整表提交。
- **新增明细行不要传全零 Guid**，会被当成「传了主键」后静默丢弃；行 key 用前端自维护的临时值。
- **SortId 必须唯一且连续**：主键是 Guid，重复 SortId 的兜底排序是随机的，提交前按行序整表重排。
- **销售恰好 1 个 + 所属组织必须是该销售的直属组织**（父组织不算），切换销售时会清空已选组织，避免保存时才撞后端校验。
- **分组字段与海运不通用**：空运只支持 3/5/6/12/13/15/16/17/18，传海运的船公司 `4` 会直接报「不支持的分组字段」。
- **报关日期、送仓日期筛选**：止端要补到当天 23:59:59，否则当天带时分秒的数据会被漏掉。
- **明细区间筛选是「存在满足条件的行」语义**，不是整票合计后比较，搜索区已加说明文案。
