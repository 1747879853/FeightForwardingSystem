---
title: 海运进出口新增码头航次
module: 海运出口 / 海运进口
author: auto-doc-sync
last_updated: 2026-09-01
---

# 1. 背景意图 (Background)

海运出口、海运进口原来只有一个「航次」字段 `innerVoyno`，存的是船公司航次。港区另有一套航次编号，飞驼码头船舶计划认的是港区航次。后端已新增 `terminalVoyno`，前端需要分开录入，并把飞驼返回的 `evoyage`/`ivoyage` 写到码头航次，不能再回填到船公司航次。

# 2. 核心逻辑变更

- 基础信息在「船名/航次」后面增加独立字段「码头航次」`terminalVoyno`（出口上限 64、进口上限 32），详情回填与保存走 `flattenDetail` / `buildSeaExportDto`（或进口对应函数）。
- 列表增加 `terminalVoyno` 列（排在航次后）和 `TerminalVoyno` 模糊筛选；关键字 `Keyword` 仍不含码头航次。
- 飞驼 `QueryTerminalScheduleAsync` 选中条目后：出口用 `evoyage`、进口用 `ivoyage` 写入 `terminalVoyno`。不再写 `innerVoyno`。
- 查询结果用 `filteredByTerminalVoyno` 判断是否按码头航次过滤；未过滤时弹窗给出警告，不默认取第一条。`terminalVoynoConverted=true` 时提示换算结果尚未落库。

# 3. 避坑指南 (Blockers)

> [!IMPORTANT] **两个航次不能混。** `innerVoyno` 是船公司航次，`terminalVoyno` 是港区航次。飞驼条目里的 `evoyage`/`ivoyage` 都是码头航次。

> [!NOTE] **换算结果不落库。** 业务单没填码头航次时，后端会拿船公司航次换算一次再查计划；要固化必须用户引入或手填后走编辑保存。
