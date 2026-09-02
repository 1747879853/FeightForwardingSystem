---
title: 船期查询方案分组规则沉淀
module: 航线管理
author: auto-doc-sync
last_updated: 2026-09-01
---

# 解析目标

把 `/schedule` 现行方案分组规则从代码和对照结论抽成可单独维护的模块文档，避免只散落在 changelog 与页面活文档的一两句摘要里。

# 核心逻辑梳理

权威实现是 `src/views/schedule-query/data.ts`。查询仍是扁平 `QueryScheduleAsync`；方案卡按 `直达|中转 + groupName` 重建。`groupName` 有共舱只用共舱 `船公司(航线)` 字母序拼接，无共舱才用本班次。星期、航程、码头、中转港不进键。清洗丢掉无船名 / feeder / to be / tbn，组内按船名+航次去重。

完整规则、例子、与飞驼方案列表差 1 组的口径见 [方案分组规则](../modules/schedule-query/grouping.md)。

# 文档偏差 / 架构洞察

- 页面活文档第 2 节原先只有分组摘要，细则（脏串、众数星期、卡车 CNC、WHL(AA1)「列表没卡但底层有船」）需要独立页才能写清。
- 旧 changelog `change-log-2026-09-01-schedule-query-scheme-workbench.md` 写的是「按航程、码头、中转港分组」，已不是现行逻辑，以 `grouping.md` 为准。
