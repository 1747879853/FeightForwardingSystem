---
title: 海运出口运踪 UI 精简（去订阅列/Tag、保存复制合并、时间轴苹果风）
date: 2026-07-11
type: Style
scope: apps/web-antd
module: 海运出口 / 运踪订阅
---

# 背景意图

运踪相关入口信息冗余：编辑页顶栏订阅状态 Tag、列表「运踪订阅」列都能被「运踪状态」列/按钮可点击性表达；同时顶栏按钮偏多。本次做信息与操作收敛，并把运踪时间轴改为苹果风。

# 核心逻辑变更

1. **编辑页顶栏（`basic-info-form/form.vue`）**：
   - 移除订阅状态 `Tag`（是否订阅可由「查看运踪」「运踪订阅」按钮是否可点击判断）。
   - 移除「取消」按钮。
   - 「复制」与「保存」合并为一个 `Dropdown.Button`：主按钮为「保存」，悬浮（`trigger: hover`）展开下拉项「复制」（需 `Admin.SeaExport.Add`）；新建态无复制项时回退为普通「保存」按钮。
   - 清理随之失效的 `handleCancel`、`yundangSubscribeStatusMeta` 及 `getYundangSubscribeStatusMeta` 引用。
2. **列表（`data.ts` / `list.vue`）**：删除「运踪订阅」列（`isYundangSubscribed` slot），保留「运踪状态」列即可涵盖是否订阅信息；清理 `getYundangSubscribeStatus(Meta)` 引用。
3. **运踪时间轴（`modules/yundang-tracking-modal.vue`）**：里程碑/箱轨迹改苹果风——实心填充圆点 + 白色 phosphor 图标、系统色（蓝/绿/橙/灰）、胶囊状态标签、细分隔线；圆点与分割线统一对齐到 12px 中轴。状态文案「待发生」拆为「计划中」（有计划时间）/「未到」（无时间）。

# 避坑指南

- 判断是否订阅改看按钮可点击态与「运踪状态」列，不再依赖顶栏 Tag / 独立订阅列。
- 保存/复制为同一 `Dropdown.Button`：主键点击=保存，下拉项=复制；复制仍要求编辑态且有 `Admin.SeaExport.Add`。
- 时间轴圆点尺寸若调整，需同步中轴 `12px`（= 圆点尺寸的一半）以保持对齐。
