# 海运出口业务来源空值改短横线展示-2026-07-24

## 背景意图

- 已选委托单位但客户未维护业务来源时，原先仍渲染禁用下拉并以「-」作 placeholder，白白占约 120px 宽度。
- 改为仅展示纯文本「-」，未选委托单位时仍用禁用下拉提示「按委托单位自动带出」。

## 核心逻辑变更

- `showCodeSourceEmptyDash`：`linkedClientId` 有值且 `headerCodeSourceId` 为空时为 true。
- 头部业务来源区：`v-if` 文本「-」 / `v-else` `CodeSourceSelect`（disabled）。

## 避坑指南

- 空值判断用 `== null`，兼容 `undefined` 与清空后的空值。
- 有来源 id 时仍走下拉回显，勿误切到短横线分支。
