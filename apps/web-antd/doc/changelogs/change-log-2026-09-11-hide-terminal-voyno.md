---
title: 海运进出口隐藏码头航次
date: 2026-09-11
module: sea-exports / sea-imports
---

# 背景意图

码头航次 `terminalVoyno` 仍要随单据保存，并在引入码头船舶计划时回填，但操作界面不再展示该字段，避免和船公司航次混看。

# 核心逻辑变更

1. **表单仍提交：** 海出/海进基础信息把 `terminalVoyno` 做成隐藏项（`formItemClass: 'hidden'`），详情回填、AI 识别、`buildSeaExportDto` / `buildSeaImportDto` 与码头计划 `setFieldValue` 不变。
2. **列表不展示：** 海出/海进 `useColumns` 去掉 `terminalVoyno` 列，避免用户列设置再勾出来；筛选框 `hidden`；海出台账默认列配置同步去掉。
3. **选计划弹窗：** `terminal-schedule-picker-modal` 去掉「码头航次」列；换算提示、查询条件与操作说明也不再出现「码头航次」。选中后仍把 `evoyage`/`ivoyage` 写入隐藏的 `terminalVoyno` 并保存。
4. **费用/更改单摘要：** 默认不再展示码头航次。

# 避坑指南

- 不要从 schema 删除 `terminalVoyno`，否则引入码头计划后保存会丢值。
- 已保存过列设置或费用摘要配置的用户，本地仍可能勾出该列；新用户与「恢复默认」后不再显示。
- 飞驼航次仍只能写 `terminalVoyno`，不能写 `innerVoyno`。
