# 海运出口船期同步日期按钮

## 背景意图

新建/编辑页填写船名、航次、开船日期后，需按历史票证最高频日期组合辅助回填 ATD、ETA、截 VGM、截单、截舱单，减少重复录入。

## 核心逻辑变更

- 船期信息标题栏新增「同步日期」按钮；船名、航次、开船日期三项齐全才可点击。
- 对接 `GET /api/services/app/SeaExportAdmin/GetDates`；`result === null` 静默处理，仅回填非 null 字段。
- 新建/编辑共用 `form.vue`；逻辑收敛至 `use-sync-shipment-dates.ts`。

## 避坑指南

- ETD 查询参数使用 `YYYY-MM-DDTHH:mm:ss`，与详情/保存口径一致。
- 快速连续点击以最后一次请求为准；无历史数据不弹错、不清空已有值。
