# 用户管理列表查询区改为一行 4 列

## 背景意图

- 用户管理列表顶部查询区沿用表格默认栅格（大屏 3 列），关键词、用户属性、角色三个条件会把查询/重置按钮挤到第二行。
- 目标是在不改动查询字段语义和交互逻辑的前提下，把查询区排成一行 4 列，条件与操作按钮同屏一行。

## 核心技术决策/逻辑变更

- 在 `apps/web-antd/src/views/system/user/list.vue` 的 `formOptions` 中新增 `wrapperClass: 'grid-cols-4'`。
- 通过表单容器栅格列数统一控制查询区域布局；页面级 `wrapperClass` 会覆盖表格默认的 `lg:grid-cols-3`。
- 保持原有 `schema`（关键词、用户属性、角色）、`submitOnChange` 与 `showCollapseButton` 行为不变。

## 避坑指南（Gotchas & Constraints）

- 仅调整布局列数，不应在本次改动中顺带修改查询字段顺序、字段显隐或默认值。
- 现有查询字段只有 3 项，第 4 列留给查询/重置按钮；若后续新增筛选字段，仍会按 4 列自动换行。
- 同类列表页如需对齐为 4 列，优先在对应 `list.vue` 的 `formOptions.wrapperClass` 处理，保持改动范围最小。
