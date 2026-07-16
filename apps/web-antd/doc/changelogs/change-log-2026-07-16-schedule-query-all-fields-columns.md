# 船期查询列表全字段展示

## 背景意图

飞驼 `QueryScheduleAsync` 返回字段较多，此前列表只展示了常用列。按需求将接口返回的**全部字段**在列表中展示，业务可按需在工具栏「列设置」中显隐。

## 核心逻辑变更

- `views/schedule-query/data.ts`
  - `useColumns` 补齐全部字段列：船舶 `imoNumber`/`mmsi`/`callSign`、`shipManagerEn`、起运/目的港 `pol`/`pod`（原始英文）、`*Country`、`*Terminal`（原始）与 `*TerminalCn`（标准）、`*UnCode`/`*UnName`/`*TimeZone`、`routeEtd`/`routeEta`、`staticEtdWeekOfYear`、`atd`/`ata`、`shareCabins`（共舱）、`manifestCutoff`/`cvCutoff`、`scac` 等。
  - 新增 `text()` 空值兜底与 `formatShareCabins()` 共舱摘要函数。
  - 内部字段 `pathCode`/`pathDescription`/`solutionDescription`/`solutionCode` 默认 `visible: false`，可在列设置中开启。
  - `pol`/`pod` 组合插槽列的 `field` 改为 `polName`/`podName`，避免与新增的原始英文名列（`field: 'pol'`/`'pod'`）列 key 冲突。

## 避坑指南

- vxe 列的 `field` 是列唯一 key，同一 `field` 出现两次会导致列显隐/持久化异常；组合插槽列与单字段列必须用不同 `field`。
- 列很多时依赖列宽持久化与横向滚动；如需默认精简可把不常用列 `visible: false`。
