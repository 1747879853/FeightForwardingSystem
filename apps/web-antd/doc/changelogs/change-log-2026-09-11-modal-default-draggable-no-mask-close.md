# useVbenModal 默认可拖动且点遮罩不关闭

## 背景意图

业务弹窗误点遮罩易丢未保存内容，且多数弹窗需要拖开对比列表。原先默认 `closeOnClickModal: true`、`draggable: false`，只能逐页覆盖。

## 核心逻辑变更

- `packages/@core/ui-kit/popup-ui`：`ModalApi` 默认改为 `draggable: true`、`closeOnClickModal: false`，全站 `useVbenModal` 生效。
- 工作流残留的 Ant Design `a-modal`（选人/选角色/发布错误提示）补 `:mask-closable="false"`。
- Cursor 规则 `common-components-catalog` 登记约定，避免后续再逐个写重复配置。

## 避坑指南

- `Modal.confirm` / `Modal.info` 等确认框不受影响，仍按 Ant Design 默认行为。
- 个别场景若必须点遮罩关闭，在该弹窗显式传 `closeOnClickModal: true`。
- 全屏时拖拽会自动禁用（框架已有 `shouldDraggable` 判断）。
