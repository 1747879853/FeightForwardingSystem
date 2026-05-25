# workbench-port-header

## 作用

展示当前作业港口、港口切换按钮、处理中/已处理状态切换区域。

## Props

- `activePort: string` 当前港口 key
- `activePortMeta: PortTab` 当前港口元信息（用于标题与数量）
- `activeProcessingTab: string` 当前处理状态 key
- `ports: PortTab[]` 港口数组
- `processingTabs: ProcessingTab[]` 状态切换数组

## Emits

- `update:activePort`
- `update:activeProcessingTab`

## 对接建议

- `activePort` 切换后触发列表查询。
- `activeProcessingTab` 可直接映射接口中的处理状态枚举。
