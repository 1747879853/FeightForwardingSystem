# 运价批量新增港口列改为远程搜索

## 背景意图

批量新增 Handsontable 港口单元格原先把 `GetListAsync` 全量港口塞进 autocomplete `source`，港口量大时加载慢、内存高，且全量接口也可能截断导致选不全。

## 核心逻辑变更

- 新增 `usePortRemoteAutocomplete`：按输入关键字调用 `PortCodeAdmin/GetPagedListAsync`（启用港、sortId 降序、每页 50），边搜边维护 label↔id；下拉滚到底自动加载下一页并追加（监听 `.wtHolder` 原生 scroll；每次 open 重建的内部 htEditor 会重新绑定）。
- 起运港/目的港/中转港1/2 的 `source` 改为函数，并设 `filter: false` 避免本地二次过滤打乱分页；`cells` 不再用全量 ports 覆盖。
- `fetchFreightRateDropdownData` 跳过港口全量加载；提交用的 `labelToIdMap.ports` 合并远程搜索缓存。
- 批量编辑入参透传 `pol/pod/poT1/poT2` 对象，必要时按 ID 拉详情回显。

## 避坑指南

- 用户必须从下拉选中港口（或搜索命中后再选），手工乱填名称会无法映射到 id。
- `rememberPort` 需替换 Map 引用，否则 `labelToIdMap` computed 感知不到搜索命中。
- 打开弹窗会 `clearPortCache`，编辑回填依赖嵌套港口对象或详情接口。
