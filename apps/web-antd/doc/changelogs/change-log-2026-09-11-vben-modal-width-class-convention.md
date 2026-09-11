# useVbenModal 弹窗宽度须用 class 且勿被自定义 class 覆盖

## 背景意图

客户账期「新增/编辑」弹窗视觉改造时，模板写了 `width="1200px"` 与自定义 `class="billing-period-modal"`，实际宽度仍停在框架默认 `520px`，导致 5 列表单被挤扁。

## 核心逻辑变更

- 明确：`ModalProps` 无 `width`；宽度入口为 Tailwind `class`（如 `w-[1200px]`）。
- 子组件自定义 class 须与宽度类合并，避免盖掉父层 `connectedComponent` 的 `class: 'w-[1200px]'`。
- 规范落点：`doc/guides/vben-modal-width.md`、Cursor 规则 `vben-modal-conventions`。

## 避坑指南

- 不要给 `<Modal>` 传 `width` / `:width`。
- 模板若写 `class`，必须自带 `w-[…px]`（或不再在模板传 class，只在 options 设完整 class）。
- 改完宽度后用开发者工具确认 DialogContent 是否同时存在默认 `w-[520px]` 与业务 `w-[1200px]`（后者应胜出）。
