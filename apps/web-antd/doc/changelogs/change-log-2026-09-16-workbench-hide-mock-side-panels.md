---
title: 全品牌工作台隐藏紧急处理与异常业务
date: 2026-09-16
module: dashboard
---

# 背景意图

工作台「紧急处理任务 (Emergency Queue)」「异常业务 (Exceptions)」仍为 mock，此前仅津海通、龙山打包环境隐藏。现改为所有品牌均不展示。

# 核心逻辑变更

`apps/web-antd/src/views/dashboard/workspace/index.vue`：

- 移除 `hideWorkbenchMockSidePanels` 及 `isJhtBrand` / `isLongshanBrand` 判断
- 不再挂载 `WorkbenchEmergencyQueue`、`WorkbenchExceptionPanel`
- 同步去掉对 `emergencyTasks`、`exceptionSummary` 的引用

组件与 mock 数据文件仍保留，便于日后对接真实接口后恢复。

# 避坑指南

- 海运出口 Tab 主列表布局不再依赖右侧异常面板；审核 Tab 原本就不渲染这两块，无需额外改动
