---
title: 业务联系单港口选中态改为英文名-中文名
module: 业务联系单
author: auto-doc-sync
last_updated: 2026-08-19
---

# 背景意图

业务联系单起运地/目的地选中后只显示 EDI（如 CNTAO），与长泽 `QINGDAO-青岛` 不一致。要求仅改业务联系单，海运出口继续显示 EDI。对应 TAPD #0839。

# 核心逻辑变更

- `PortSelect` 增加特殊 `labelKey: 'portNameCnName'`：有英文名和中文名时拼 `portName-cnName`，缺中文名则只显示英文名。
- 业务联系单新增 `buildPreOrderPortSelectProps`，在海出共用的 `buildPortSelectProps` 之上覆盖 `labelKey`；主表起运地/目的地与港口区各港、以及 `editor.vue` 里所有 `updateSchema` 回填都走这一层。
- 海出 `labelKey: 'ediCode'` 不变。选港后自动回填的备注字段仍是 `PORTNAME, COUNTRYENNAME`。

# 避坑指南

- **不要改 `buildPortSelectProps` 的默认 labelKey**，海出/船期等仍依赖 EDI。
- 编辑回显依赖详情港口对象带 `portName`/`cnName`；字段不齐时 `PortSelect` 仍会拉详情补全，避免只显示 EDI 或 id。
