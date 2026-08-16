# 2026-08-16 空运出口收发通折叠，备注改到货物区 Tab

## 背景意图

空运出口基础信息里，收发通占位较高，内部备注与外部备注原先在收发通下方各占一块 textarea。按海运进口已落地的布局：收发通改为灰色折叠条（默认展开）；两个备注共用一块输入区、顶部 Tab 切换，并放到货物卡片件重尺右侧一列。

## 核心逻辑变更

1. **收发通折叠：** `partyExpanded` 默认 `true`；灰色条文案「收发通」+ chevron，点击或键盘 Enter/Space 切换；内容用 `v-show`，不销毁 `PartyInfoForm`。
2. **备注位置：** 从收发通下方挪到货物卡片 `cargo-main-layout__remark` 第三列（固定 320px），紧挨件重尺列。
3. **备注切换：** `CargoRemarkForm` 仍同时持有 `internalRemark` / `remark`，用 `remarkTab` + `data-remark-tab` 只显示当前 Tab；输入改为无边框 `Input`，样式对齐海运进口（Tab 帽 + `#fcfdfe` 卡片）。
4. **高度对齐：** 备注列 `minHeight` 跟件重尺列底对齐；观察目标仍是件重尺列，避免互相撑高。
5. **文案：** 新增 `airExport.export.externalRemark`（外部备注）。

## 避坑指南

- 不要用 `v-if` 按 Tab 卸载备注字段，否则切换会丢未落库输入；用 CSS `display: none` 隐藏非当前项。
- 折叠也不要用 `v-if`，否则收起再展开会丢未保存的收发通内容。
- 高度同步观察的是件重尺列（`cargoMainLayoutRightRef`），不要改成观察备注列。
- 新建 / 编辑共用 `basic-info-form/form.vue`，两处布局一起变。
