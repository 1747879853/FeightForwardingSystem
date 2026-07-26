# biz-select 禁用无值只读态显示「-」

## 背景意图

业务选择组件整体 `disabled` 时以只读文本呈现，但无选中值时仍会露出 Ant Design Vue 的 placeholder（如「请选择」），在详情/只读页造成「像还能编辑」的误导。需要统一为空值占位 `-`。

## 核心逻辑变更

- 在 `biz-select-readonly.css` 中隐藏禁用态 `.ant-select-selection-placeholder` 原文案。
- 用 `::before { content: '-' }` + `visibility: visible` 输出统一占位符，无需逐个 biz-select 改 `placeholder` prop。

## 避坑指南

- 勿对 placeholder 节点直接改 `content` 覆盖文本节点；Ant Select 的 placeholder 是真实 DOM 文本，用 `visibility: hidden` + 伪元素更稳。
- 有值时走 `.ant-select-selection-item`，本规则只影响无值禁用态，不影响可编辑态 placeholder。
