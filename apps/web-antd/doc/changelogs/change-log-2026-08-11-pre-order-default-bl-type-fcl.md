---
title: 业务联系单新建装运方式默认整柜
date: 2026-08-11
module: pre-order
---

# 背景意图

新建业务联系单时，标题栏「装运方式」原先为空，需用户每次手动选择。业务要求默认「整柜」。

# 核心逻辑变更

`apps/web-antd/src/views/pre-order/editor.vue`：

- `headerBlType` 初始值由 `undefined` 改为 `0`（整柜，与 `getBlTypeOptions` 枚举一致）
- 编辑/详情回显仍由 `fillFromDetail` 覆盖，不受默认值影响

# 避坑指南

- `0` 是合法枚举值，校验仍用 `== null`，不要写成 falsy 判断（否则会把整柜当成未选）
