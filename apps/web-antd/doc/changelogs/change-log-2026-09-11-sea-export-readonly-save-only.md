---
title: 海运出口无编辑权限时仅禁用保存
date: 2026-09-11
module: sea-exports
---

# 背景意图

编辑页无 `Admin.SeaExport.Edit` 或票根 `isEditable !== true` 时，原先会整页只读（表单 disabled + 中间/右侧栏 pointer-events）。业务只需要拦住落库，表单仍要能改、能看、能复制。

# 核心逻辑变更

1. **不再锁表单：** 去掉 `setFormApisDisabled`、页头控件 `disabled`、中间/右侧栏 `pointer-events: none`。
2. **只禁保存：** `submitBasicInfo` 仍在只读时直接 return；顶栏保存按钮保持禁用，复制仍拆成独立按钮。
3. **重新生成委托编号** 仍要求 `Edit` ∧ `isEditable`（立刻写库，不走保存按钮）。

# 避坑指南

- 能改界面 ≠ 能落库。码头计划引入、场站实查、服务项配置确定后仍会走 `submitBasicInfo`，只读时不会写库。
- 已完成服务的 `seServiceLocks` 字段锁定不受本次影响。
- 海进 / 空出未改，仍是整页只读。
