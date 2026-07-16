# 船期查询对接飞驼新增字段（MMSI 定位）

## 背景意图

飞驼 `QueryScheduleAsync` 接口更新了返回字段：船期明细新增 `mmsi`、`imoNumber`、`callSign`、`shareCabins`（共舱）、`*TerminalCn`（码头标准名）、`*UnCode`/`*UnName`（UN 港口）、`manifestCutoff`/`cvCutoff`（截舱单/放行条）、`staticEtdWeekOfYear` 等；中转港新增 `portEn`/`portTimeZone`/`terminalCn`/`imoNumber`/`mmsi`/`callSign`；返回结构新增 `status`/`size`。前端需对齐类型并利用真实 MMSI 做船舶定位。

## 核心逻辑变更

- `api/schedule/feituo-schedule-admin.ts`
  - `FeituoScheduleItemDto` 补全全部新增字段；`polTerminal`/`podTerminal` 语义修正为「船公司原始数据」，标准名走 `polTerminalCn`/`podTerminalCn`。
  - `FeituoScheduleTransitDto` 补全 `portEn`/`portTimeZone`/`terminalCn`/`imoNumber`/`mmsi`/`callSign`。
  - 新增 `FeituoShareCabinDto`；`FeituoScheduleResultDto` 增 `status`/`size`。
- `views/schedule-query/list.vue`
  - 双击定位改为 `row.mmsi || row.vessel`，两者皆空才提示无法定位。
  - 起运/目的港码头展示回退 `*TerminalCn || *Terminal`；中转港 tooltip 码头同样优先标准名。

## 避坑指南

- `mmsi` 更精准，务必优先于船名；船名含空格/别名时可能定位不准。
- `polTerminal`/`podTerminal` 现在是原始数据，展示给业务应优先 `*TerminalCn`。
- `size` 与 `pageSize` 同义（飞驼别名），分页仍以 `total`/`pageSize` 为准。
