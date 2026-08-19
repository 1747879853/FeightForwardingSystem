# 海出 / 海进 / 空出对接 `isEditable` 行级可编辑

## 背景意图

列表、详情出参在票根上新增只读布尔 `isEditable`。`true` 才能改、删、重新生成委托编号；`false` 时对应写入口禁用。详情能打开只说明有查询口径，不能据此推断可保存。功能权限与 `isEditable` 两道都要过。

## 核心逻辑变更

- DTO：`SeaExportDto` / `SeaImportDto` / `AirExportDto` 增加 `isEditable?`（挂在票根，不在 `transportOrder`）。缺字段按 `false`。
- 列表：删除按钮在「恰好选中 1 条且 `isEditable !== true`」时禁用；复制、双击进详情不拦。
- 详情：以 `DetailAsync` 返回值为准。无 `Edit` 功能权限或 `isEditable !== true` 时基础信息整页只读（VbenForm `commonConfig.disabled` + 页头控件 disabled + 自定义区 pointer-events），保存禁用，复制仍可用；重新生成委托编号同时要求 `Edit` 权限与 `isEditable`。
- 写接口失败仍走全局 `error.message` 弹出（含「没有这条数据的数据权限,不能编辑」）。附件、新建、复制不看 `isEditable`。

## 避坑指南

- 能看 ≠ 能改。上线后会有一批以前能改、现在按钮是灰的单子，先让客服配编辑口径的数据权限，前端不要做本地绕过。
- 不要读 `transportOrder.isEditable`。
- 不要用「打开详情成功」推断可保存；以当次详情的 `isEditable` 为准，不要只信列表带过来的值。
