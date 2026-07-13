---
title: 全局表格选中行背景统一为主题色 15% 透明
module: 共享能力
author: auto-doc-sync
last_updated: 2026-07-12
---

# 全局表格选中行背景统一为主题色 15% 透明

## 背景意图

业务希望全站表格（含列表页 vxe-grid 与弹窗/子模块 antd Table）的**行选中背景色**跟随主题主色 `--primary`，并以 15% 透明度呈现，替代原先偏灰的 `--accent` 或硬编码 `#e6f4ff`，保证视觉与品牌色一致。

## 核心逻辑变更

### 1. antd Table（`packages/styles/src/antd/index.css`）

在 `.ant-app` 作用域下新增全局覆盖，作用于：

- `.ant-table-row-selected > td`
- 选中行 hover 态
- `.ant-table-cell-row-hover` 单元格

统一为：`background: hsl(var(--primary) / 15%) !important;`

### 2. vxe-grid（`packages/effects/plugins/src/vxe-table/style.css`）

`:root .vxe-grid` 内将以下 CSS 变量由 `hsl(var(--accent))` / `hsl(var(--accent-hover))` 改为主色 15%：

| CSS 变量 | 场景 |
| :-- | :-- |
| `--vxe-ui-table-row-checkbox-checked-background-color` | checkbox 勾选高亮（如 `/sea-exports` 列表） |
| `--vxe-ui-table-row-hover-checkbox-checked-background-color` | checkbox 选中行 hover |
| `--vxe-ui-table-row-radio-checked-background-color` | radio 单选高亮 |
| `--vxe-ui-table-row-hover-radio-checked-background-color` | radio 选中行 hover |
| `--vxe-ui-table-row-current-background-color` | 当前行高亮 |
| `--vxe-ui-table-row-hover-current-background-color` | 当前行 hover |

### 3. 页面局部覆盖对齐

以下页面原先 scoped 内硬编码 `#e6f4ff`，已改为同一表达式，避免 `:deep` 规则盖过全局：

- `apps/web-antd/src/views/sea-export-admin/dispatch/index.vue`（派车 antd 表格）
- `apps/web-antd/src/views/sea-export-admin/modules/separate-bill.vue`（分单 antd 表格）

## 避坑指南

1. **列表页多为 vxe-grid，不是 antd Table**：仅改 `packages/styles/src/antd/index.css` 不会影响 `/sea-exports` 等 `useVbenVxeGrid` 页面；需同步改 `packages/effects/plugins/src/vxe-table/style.css` 中 checkbox/radio/current 相关变量。
2. **选中态与 hover 态分离**：vxe 的 `--vxe-ui-table-row-hover-background-color`（未选中行 hover）仍为 `--accent-hover`，本次未改；勿与选中背景变量混淆。
3. **局部 `!important` 会覆盖全局**：业务页若再写 `#e6f4ff` 等硬编码，会导致该页与全站不一致；应复用 `hsl(var(--primary) / 15%)` 或删除冗余局部样式。
