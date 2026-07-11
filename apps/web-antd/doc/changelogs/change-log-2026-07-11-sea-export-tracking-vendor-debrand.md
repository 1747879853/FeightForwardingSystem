---
title: 运踪模块去除第三方服务商名称（云当去品牌化补漏）
date: 2026-07-11
type: Style
scope: apps/web-antd
module: 海运出口 / 运踪订阅
---

# 背景意图

运踪能力对接第三方服务商，属商业机密。页面与文档不应出现服务商名称；2026-07-07 已做过一轮 i18n 去品牌化，本次补漏遗漏的用户可见文案与注释/文档。

# 核心逻辑变更

1. **i18n**：`seaExport.yundang.tracking.waitingPushDesc` 去除服务商名称，改为「运单动态异步推送中…」。
2. **源码注释**：`sea-export-admin.ts`、`yundang-admin.ts`、`form.vue`、`use-yundang-ocean-subscribe.ts` 等注释改为「运踪/海运运单运踪」表述。
3. **活文档与变更记录**：历史 changelog / 模块文档中「云当」字样统一改为「第三方运踪」或「运踪订阅」等中性词。

# 避坑指南

- **用户可见层**不得出现服务商品牌；统一使用「运踪订阅」「运踪状态」「运踪详情」。
- **内部对接层**（`YundangAdmin` 接口路径、`isYundangSubscribed` 等后端 DTO 字段、文件名 `yundang-*`）与后端契约一致，仅开发侧可见，本次不改以免破坏联调。
- 新增文案或文档时继续遵守上述分层：对外中性、对内可保留 API 原名。
