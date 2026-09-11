# 运价批量新增港口/船公司/订舱代理改为远程搜索

## 背景意图

批量新增 Handsontable 原先把港口/船公司/订舱代理全量塞进 autocomplete `source`，数据量大时加载慢、内存高，且全量接口也可能截断导致选不全。

## 核心逻辑变更

- 港口：`usePortRemoteAutocomplete` → `PortCodeAdmin/GetPagedListAsync`
- 通用远程能力：`useRemoteAutocomplete`（关键字分页 + 下拉滚到底追加）
- 船公司：`useCarrierRemoteAutocomplete` → `CarrierAdmin/GetPagedListAsync`，标签 `CODE(中文简称)`
- 订舱代理：`useBookingAgentRemoteAutocomplete` → `Client/GetPagedListAsync`（`industryCategory=o`）
- 上述列 `source` 为函数并设 `filter: false`；单元格保留展示文案，提交时经 `labelToIdMap` 映射
- `fetchFreightRateDropdownData` 跳过港口/船公司/订舱代理全量预载；仅保留箱型与币别
- 批量编辑透传 `pol/pod/poT1/poT2/carrier/bookingAgent`；船公司缺嵌套时按 ID 拉详情回显

## 避坑指南

- 用户必须从下拉选中（或搜索命中后再选），手工乱填名称会无法映射到 id
- `remember*` 需替换 Map 引用，否则 `labelToIdMap` computed 感知不到搜索命中
- 打开弹窗会清空远程缓存，编辑回填依赖嵌套对象或详情接口
