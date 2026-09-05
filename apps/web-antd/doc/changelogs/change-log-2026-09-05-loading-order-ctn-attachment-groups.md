# 2026-09-05 管理端按箱型 id 编辑监装附件分组

## 背景意图

师傅端 `EditOrderCtnsAsync` 一次提交整票箱子，还能改箱型、箱号、封号、是否完成，并且只有已认领能调。管理端需要在任意状态下单独改某一只箱子的监装照片，不碰箱子本身、也不走工单状态机。

## 核心逻辑变更

- 监装 Tab 照片采集保存改调 `PUT /services/app/LoadingOrderAdmin/EditOrderCtnAttachmentGroupsAsync`（封装为 `editOrderCtnAttachmentGroups`）。
- 入参 `id` 取 `orderCtns[].id`（`OrderCtn.Id`），只带该箱 `attachmentGroups`；不再把整票箱子、箱号、封号、是否完成、工单 id 塞进请求。
- 权限复用 `Admin.SeaExport.LoadingOrder.Edit`。未提交 / 待认领 / 已认领 / 已完成都可以改照片；工单主表仍只允许未提交编辑/删除、待认领撤回。
- 无编辑权限时点「照片采集」只预览，不打开编辑弹窗。
- 去掉管理端对师傅端 `LoadingOrder/EditOrderCtnsAsync` 的调用。

## 避坑指南

- **这不是工单编辑，也不是师傅端编辑箱型的单条版。** `id` 是箱型主键，不是监装工单 id。不要把箱号、封号、是否完成传给这个接口——后端不会写。
- **附件按该箱全量替换。** 漏传某个分组等于删掉该组照片；`attachmentGroups: []` 等于清空该箱全部监装附件。弹窗里要带上该箱当前全部分组再改，不要只传增量。
- 真要改箱子字段，仍走师傅端 `EditOrderCtnsAsync`（且仍要求已认领），管理端箱型/箱号/封号/是否完成保持只读。
