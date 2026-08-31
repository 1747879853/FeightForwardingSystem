---
title: 海运出口委托单位与订舱代理按场站同款展示联系人
date: 2026-08-31
module: sea-exports
---

# 背景意图

海出基础信息里委托单位、订舱代理选了客户后看不到联系人。后端 8 月已提供联系人 Id 与简易对象，前端未展示、保存也没带 Id。TAPD 要求先按场站：姓名挂在标签右侧，悬停看出联系方式。

# 核心逻辑变更

- 「委托单位」「订舱代理」标签右侧展示联系人姓名，悬停看邮箱 / 手机 / 电话；空显示 `-`。
- 选客户后拉该客户未禁用联系人，优先默认，否则第一条；清空客户则清空联系人。
- 编辑回填详情 `transportOrder.clientContact` / `bookingAgentContact`，不在回填时改写成默认联系人。
- 保存提交 `transportOrder.clientContactId`、`bookingAgentContactId`；清空父客户时联系人传 `null`。
- 本轮不加独立联系人下拉。

# 避坑指南

- 联系人是客户联系人 Id，不是场站那套四段字符串。展示学场站，存盘走 Id。
- 详情回填期间 `suppressServiceTypeLinkage` 为 true，不要此时去拉默认联系人，否则会盖掉已保存的非默认联系人。
- `clientContactId` 在 `transportOrder` 上，`bookingAgentContactId` 在海出根上，层级不要放反。
- 保存必须带回当前 Id：漏传时编辑接口会按空覆盖（与场站四字段同一类坑）。
- 清空订舱代理后不能再带订舱代理联系人，后端会校验。
