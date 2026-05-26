# workbench-emergency-queue

## 作用

展示紧急处理任务横向卡片队列（告警类型、倒计时、标题、SO、处理按钮）。

## Props

- `tasks: EmergencyTask[]`

## Emits

- 当前版本未输出事件（纯展示）。

## 对接建议

- 可新增 `@handle(taskId)` 事件对接“立即处理”接口。
- 列表建议按剩余时间升序排序，增强紧急任务优先级。
