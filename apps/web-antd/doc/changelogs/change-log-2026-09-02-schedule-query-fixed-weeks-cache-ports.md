# 船期查询固定 8 周并缓存起运目的港

## 背景意图

查询范围几乎总是 8 周，工具栏上的周数下拉占位置。同事反复查同一航线时，每次进页都要重选起运港和目的港。

## 核心逻辑变更

- 去掉「查询 N 周」下拉。接口始终传 `weeksOut=8`（`QUERY_WEEKS`），页面不再提供修改入口。
- 起运港、目的港写入本机 `localStorage`（键 `ffs.schedule-query.last-ports`，含五字码和英文/中文名）。两端都选中后即记，交换港口也会更新。
- 再次打开 `/schedule` 时回填这对港口和 `PortSelect` 回显，**不自动查询**。
- 没有 last-ports 时，回退「最近查询」胶囊的第一条（旧缓存也能回填）。结果区胶囊仍只在查询成功后更新。

## 避坑指南

- 不要进页就打 `QueryScheduleAsync`。只回填港口，用户点查询。
- 只清一侧港口时不要覆盖 last-ports，保留上一对完整港口。
- `PortSelect` 回填必须带 `selectedItems`（`portName` + `ediCode`），只写五字码不会显示 `QINGDAO (CNTAO)`。
- 不要把 EDI 五字码写进 `selectedItems.id`。`PortSelect` 在 `valueKey=ediCode` 时也不会再用当前值去打 `DetailAsync`（该接口只认港口 GUID）。
