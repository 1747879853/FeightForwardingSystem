# workbench-business-table

## 作用

业务列表主表格，包含流程节点、多选、状态标签、详情入口与批量操作区。

## Props

- `rows: BusinessRow[]` 表格数据
- `stageSteps: StageStep[]` 顶部流程节点
- `selectedRowKeys: string[]` 受控选中项

## Emits

- `update:selectedRowKeys` 勾选变化时触发
- `update:activeStageKey` 点击流程节点时触发；左侧 `table-card__sub` 同步为 `{label}控制节点`（或 `StageStep.subLabel`）
- `open-sea-export` 单击委托单号或双击数据行时触发，由页面层跳转编辑/详情

## 对接建议

- 表格数据结构建议后端返回统一字段后在页面适配，避免组件内部兼容多协议。
- `selectedRowKeys` 可直接作为批量放舱接口参数。
