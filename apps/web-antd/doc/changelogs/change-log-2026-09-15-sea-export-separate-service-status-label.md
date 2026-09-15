---
title: 海运出口分单运输条款文案更正
date: 2026-09-15
module: sea-exports
---

# 背景意图

分单主卡右侧「运输条款」下拉绑定的是运输条款（`codeServiceId` / `CodeServiceSelect`），中文文案却写成了「运输状态」，容易被当成运踪或订舱状态。

# 核心逻辑变更

1. **只改正文案：** `seaExport.export.separate.serviceStatus` 中文由「运输状态」改为「运输条款」。
2. **取值不变：** `separate-bill.vue` 仍用该 i18n key 做标签，值仍走 `formData.codeServiceId`。

# 避坑指南

- 字段 key 仍是 `serviceStatus`，不要按界面旧文案去后端或字典里找「运输状态」。
- 英文 `en-US` 仍为 `Transport Status`，本轮未改；切语言时中英含义可能不一致。
