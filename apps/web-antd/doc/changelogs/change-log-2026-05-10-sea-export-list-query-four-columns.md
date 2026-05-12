# 海运出口列表查询区改为一行 4 列

## 背景意图

- 现有海运出口列表查询区每行可见字段数偏少，筛选条件较多时需要频繁折叠/展开和滚动，影响录入与检索效率。
- 目标是在不改动查询字段语义和交互逻辑的前提下，提高同屏可见条件数。

## 核心技术决策/逻辑变更

- 在 `apps/web-antd/src/views/sea-export-admin/list.vue` 的 `formOptions` 中新增 `wrapperClass: 'grid-cols-4'`。
- 通过表单容器栅格列数统一控制查询区域布局，将查询项调整为每行 4 个。
- 保持原有 `schema`、`submitOnChange` 与 `showCollapseButton` 行为不变，避免影响现有查询和折叠逻辑。

## 避坑指南（Gotchas & Constraints）

- 仅调整布局列数，不应在本次改动中顺带修改查询字段顺序、字段显隐或默认值。
- 若后续页面出现长标签或长输入值挤压，需要优先通过字段级 `componentProps` 或 `formItemClass` 微调，而不是再次回退全局列数。
- 同类列表页如需对齐为 4 列，优先在对应 `list.vue` 的 `formOptions.wrapperClass` 处理，保持改动范围最小。
