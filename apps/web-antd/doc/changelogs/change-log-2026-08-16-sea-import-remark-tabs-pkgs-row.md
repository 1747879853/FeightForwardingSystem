# 2026-08-16 海运进口备注改为顶部切换，件数包装同行

## 背景意图

海运进口基础信息里，内部备注与外部备注原先在收发通下方并排各占一块 textarea；货物右栏件数、包装各自占一行。按设计稿改为：件数与包装同一行；两个备注共用一块输入区、顶部 Tab 切换，并放到件数包装右侧一列。

## 核心逻辑变更

1. **备注位置：** 从收发通折叠区挪到货物卡片，作为 `cargo-main-layout__remark` 第三列，紧挨件数包装列。
2. **备注切换：** `CargoRemarkForm` 仍同时持有 `internalRemark` / `remark`，用 `remarkTab` + `data-remark-tab` 只显示当前 Tab，切换不销毁表单、不丢未保存内容。
3. **件数包装：** 与船名/航次同构，用 `PkgsPackageInput` 合成一个「件数/包装」字段；`codePackageId` 仍独立落库，表单里隐藏。
4. **高度对齐：** 唛头 / 货描 / 备注 textarea 仍跟件重尺列底对齐；备注要扣掉 Tab 条高度。
5. **文案：** 新增 `seaImport.import.externalRemark`（外部备注），不再在表单里写死中文。

## 避坑指南

- 不要用 `v-if` 按 Tab 卸载备注字段，否则切换会丢未落库输入；用 CSS `display: none` 隐藏非当前项。
- 高度同步观察的是件重尺列（`cargoMainLayoutRightRef`），不要改成观察备注列，否则会互相撑高。
- 新建 / 编辑共用 `basic-info-form/form.vue`，两处布局一起变。
