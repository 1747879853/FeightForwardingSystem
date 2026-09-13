---
title: 分单船期标签 EDT 更正为 ETD
date: 2026-09-13
module: sea-exports
---

# 背景意图

分单「船期与港口」卡第一项应展示预计开船 **ETD**（Estimated Time of Departure）。界面写成了 **EDT**（时区缩写），和主单、列表的开船日期用语不一致。

# 核心逻辑变更

1. **只改正文案：** 中英文 `seaExport.export.separate.etdLabel` 由 `EDT` 改为 `ETD`。
2. **取值不变：** `separate-bill.vue` 仍用 `$t('seaExport.export.separate.etdLabel')` 做只读标签，值来自主单 `transportOrder.etd`。

# 避坑指南

- 字段 key 一直是 `etd`，不要按界面旧文案去后端找 `edt`。
- 主单/列表继续用 `seaExport.export.etd`（中文「开船日期」），分单只读区用英文缩写 **ETD**，不要混成 EDT。
