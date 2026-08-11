---
title: 龙山工作台隐藏紧急处理与异常业务 mock 面板
date: 2026-08-11
module: dashboard
---

# 背景意图

龙山品牌工作台不需要展示仍为 mock 的「紧急处理任务」「异常业务」两块，与津海通一致。

# 核心逻辑变更

`apps/web-antd/src/views/dashboard/workspace/index.vue`：

- 增加 `hideWorkbenchMockSidePanels = isJhtBrand || isLongshanBrand`
- `WorkbenchEmergencyQueue` / `WorkbenchExceptionPanel` 改为 `v-if="!hideWorkbenchMockSidePanels"`

# 避坑指南

- 仅按 `VITE_APP_BRAND` 判断；demo 等其它品牌仍会显示这两块 mock
