# workbench-filter-bar

## 作用

查询条件输入区，包含 ETD、客户、船公司、提单号，以及重置/查询按钮。

## Props

- `modelValue: FilterModel`

## Emits

- `update:modelValue` 任意字段变更时触发
- `reset` 点击重置按钮
- `search` 点击立即查询按钮

## 对接建议

- 在父组件中监听 `search` 后，组合 `modelValue + 港口 + 处理状态` 发起接口请求。
- `reset` 中建议同时清空分页并重置排序条件。
