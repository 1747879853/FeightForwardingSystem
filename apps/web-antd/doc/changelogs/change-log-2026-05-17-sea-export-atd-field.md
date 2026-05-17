# 变更记录：海运出口补充实际开船字段（ATD）

## 背景意图

- 海运出口业务接口新增了 `atd`（实际开船）字段，需要前端在类型定义、表单回填与提交链路中同步支持。
- 船期展示顺序要求明确为：开船日期（`etd`）→ 实际开船（`atd`）→ 预抵日期（`eta`），避免用户在编辑与财务摘要区读取时间时产生歧义。

## 核心技术决策/逻辑变更

- 更新 `apps/web-antd/src/api/sea-export/sea-export-admin.ts`：
  - 在 `TransportOrderAddDto`（继承到编辑/详情 DTO）补充 `atd?: string`，让海运出口接口类型与后端保持一致。
- 更新 `apps/web-antd/src/views/sea-export-admin/data.ts`：
  - 在船期表单 schema 中新增 `atd` 日期控件，位置放在 `etd` 与 `eta` 之间。
- 更新 `apps/web-antd/src/views/sea-export-admin/form.vue`：
  - OCR 可回填字段与日期字段集合补充 `atd`。
  - 详情回填 (`flattenDetail`) 增加 `atd` 映射。
  - 提交 DTO (`buildDto`) 增加 `atd` 转换与上送。
  - 船期网格从 6 列扩展到 7 列，并补充 `shipment-time-pos--7` 样式以容纳新增字段。
- 更新 `apps/web-antd/src/views/sea-export-admin/orderFee/index.vue` 与 `apps/web-antd/src/views/sea-export-admin/changeOrder/index.vue`：
  - 顶部摘要显示字段新增 `atd`，顺序位于 `etd` 与 `eta` 之间。
- 更新多语言：
  - `apps/web-antd/src/locales/langs/zh-CN/seaExport.json` 新增 `"atd": "实际开船"`。
  - `apps/web-antd/src/locales/langs/en-US/seaExport.json` 新增 `"atd": "ATD"`。

## 避坑指南（Gotchas & Constraints）

- `atd` 属于 `transportOrder` 层级字段，不能误放到海出根 DTO，否则编辑回填和提交会丢值。
- 船期 UI 位置新增字段后，需要同步检查栅格列数与位置类名，否则会出现字段换行或箭头连线错位。
- 费用页与更改单页共享显示字段配置缓存（`order_fee_display_config`），新增字段应保持 key 命名稳定，避免旧缓存解析异常。
