---
title: 列表列 field 改绑真实对象路径
date: 2026-09-15
module: other
---

# 背景意图

接口对象化后不再返回平铺 `yardName` / `clientName` 等。列 `field` 仍绑旧键时，vxe 用空 `cellValue` 做 label 缓存，格子会空白（海出场站即此）。约定：列 `field` 指向真实嵌套路径，formatter 只做格式不负责找字段。

# 核心逻辑变更

1. **海运出口：** `data.ts` 列 `field` 改绑 `yard.name`、`transportOrder.client.name`、`bookingAgent.name`、`pod.lane.laneName` 等；纯取值 formatter 删除；收发通保留 `getPartyName`。`list.vue` `fieldMap` 新增新路径并暂留旧键；`list-column-defaults.ts` 持久化 key 同步。
2. **海运进口 / 空运出口：** 列 `field` 与 `SEA_IMPORT_SORT_FIELD_MAP` / `AIR_EXPORT_SORT_FIELD_MAP` 同步改绑；空港列保留 `formatAirPortLabel`。
3. **其它列表：** 业务联系单、联系单审核、监装、付费结算、费用模板、费用锁定、港口资料、空港资料等同模式改绑。
4. **故意不改：** 海出/联系单港口备注列、干系人 `getRoleName`、`orgs[0].name`、日期/枚举/金额、船公司 Logo 插槽、费用审核 POL/POD 三业务派生等——见 `reviews/pending-list-column-object-path-rescan.md`。

# 避坑指南

- 用户列设置里旧 `field:*Name` key 会被列持久化脏键自愈清掉；新列走代码默认显隐。
- 排序 `fieldMap` 新旧键并存，避免用户本地列头排序偶发失效。
- 改 field 后建议硬刷新一次，避免 vxe label 缓存仍显示旧空值。
