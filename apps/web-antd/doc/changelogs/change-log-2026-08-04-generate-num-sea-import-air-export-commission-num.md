# 编号规则新增海运进口/空运出口委托编号

## 背景意图

海运进口、空运出口委托编号需独立配置生成规则。编号规则配置页表名下拉增加 `SeaImport.CommissionNum`、`AirExport.CommissionNum`；业务日期(ETD)段生成时由后端传入本票 ETD（海进=到港日期、空出=起飞日期），为空则用当前时间。

## 核心逻辑变更

- `GenerateNumAdmin/data.ts`：`TABLE_NAME_VALUES` 新增 `SeaImport.CommissionNum`、`AirExport.CommissionNum`；更新 ETD 预览注释口径。
- `locales/zh-CN/system.json`：新增「海运进口委托编号」「空运出口委托编号」。
- `locales/en-US/system.json`：新增对应英文文案。

## 避坑指南

- 表名值格式必须为 `Entity.Field`，与后端 `GenerateNumAsync` 约定一致。
- 前端仅提供可选项；后端需已按对应 `tableName` 取号并传入 `ETD` 后，业务创建/重生成编号才会生效。
- 不同业务的 ETD 字段含义不同：海出=开船日期、海进=到港日期、空出=起飞日期；配置页预览无单据上下文，一律按当前时间。
