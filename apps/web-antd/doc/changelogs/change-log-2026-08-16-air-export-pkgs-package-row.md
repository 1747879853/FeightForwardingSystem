# 2026-08-16 空运出口件数与包装合并为一行

## 背景意图

空运出口货物右栏原先件数、包装各占一行。对齐海运进口：视觉上合并为一个「件数/包装」字段，交互与海运进口 `PkgsPackageInput` 相同。

## 核心逻辑变更

1. **货物 schema：** `pkgs` 改为 `PkgsPackageInput`；`codePackageId` 仍独立落库，表单里隐藏。
2. **回显：** 编辑态把包装 `selectedItems` 写到 `codePackageSelectedItems`，由合并控件读取，不再往隐藏的包装下拉 `updateSchema`。
3. **比例：** 件数:包装默认 1:3，与海运进口一致。
4. **文案：** 新增 `airExport.export.pkgsPackage`（件数/包装）。

## 避坑指南

- `codePackageId` 必须仍挂在 `CargoMetricsForm` 上（隐藏即可），否则保存会丢包装。
- 包装 id 是雪花，回传时不要 `Number()`。
- 新建 / 编辑共用 `basic-info-form/form.vue`，两处一起变。
