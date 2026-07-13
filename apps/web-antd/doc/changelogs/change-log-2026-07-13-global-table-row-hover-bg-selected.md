---
title: 全局表格鼠标 hover 背景色统一为选中背景色
module: 共享能力
author: auto-doc-sync
last_updated: 2026-07-13
---

# 全局表格鼠标 hover 背景色统一为选中背景色

## 背景意图

延续「全局表格选中行背景统一为主题色 15% 透明」的视觉统一诉求，业务希望全站表格（vxe-grid 与 antd Table）在**鼠标经过（hover）行**时的背景色，与**行选中态**背景色保持一致，即统一为主色 15% 透明 `hsl(var(--primary) / 15%)`，替代原先偏灰的 `--accent` / `--accent-hover`，让 hover 与选中在观感上连贯。

## 核心逻辑变更

### 1. vxe-grid（`packages/effects/plugins/src/vxe-table/style.css`）

`:root .vxe-grid` 内将行 hover 相关变量由 `--accent-hover` / `--accent` 改为主色 15%：

| CSS 变量 | 场景 | 变更前 | 变更后 |
| :-- | :-- | :-- | :-- |
| `--vxe-ui-table-row-hover-background-color` | 普通行 hover | `hsl(var(--accent-hover))` | `hsl(var(--primary) / 15%)` |
| `--vxe-ui-table-row-hover-striped-background-color` | 斑马纹行 hover | `hsl(var(--accent))` | `hsl(var(--primary) / 15%)` |

> 注：斑马纹底色变量 `--vxe-ui-table-row-striped-background-color`（非 hover 态）保持 `--accent / 60%` 不变。

### 2. antd Table（`packages/styles/src/antd/index.css`）

在 `.ant-app` 作用域下新增全局 hover 覆盖：

```css
.ant-app .ant-table-tbody > tr > td.ant-table-cell-row-hover {
  background: hsl(var(--primary) / 15%) !important;
}
```

与既有「选中行背景」规则并存，保证未选中行 hover 也用主色 15%。

### 3. vxe-grid 行 hover 开关（`apps/web-antd/src/views/sea-export-admin/list.vue`）

vxe 的行 hover 背景**仅在 `rowConfig.isHover: true` 时才渲染**。`/sea-exports` 列表此前 `rowConfig` 只配了 `keyField`，未开 `isHover`，导致改了全局 `*-row-hover-*` 变量仍看不到 hover 效果。本次补上：

```ts
rowConfig: {
  keyField: 'id',
  isHover: true,
},
```

## 避坑指南

1. **hover 态与选中态本次已对齐**：此前 changelog（2026-07-12）仅统一了选中态，hover 仍是灰；本次专门覆盖 hover 变量/选择器，二者现在一致。
2. **列表页多为 vxe-grid**：仅改 antd `index.css` 不影响 `/sea-exports` 等 `useVbenVxeGrid` 页面，必须同步改 `vxe-table/style.css` 的 `*-row-hover-*` 变量。
3. **vxe hover 背景需 `isHover: true` 才生效**：即使全局 `--vxe-ui-table-row-hover-background-color` 已设，若某列表 `rowConfig` 未开 `isHover`，鼠标经过不会有任何背景色。`freight-rate`、`bank-statement`、`payment-review`、公告等列表已开启，`/sea-exports` 本次补开；其余若需 hover 效果需按需补 `isHover: true`。
4. **局部 `!important` 会覆盖全局**：业务页若在 scoped 里对 `.ant-table-cell-row-hover` 硬编码灰色，会盖过全局；应复用 `hsl(var(--primary) / 15%)` 或删除冗余局部样式。
