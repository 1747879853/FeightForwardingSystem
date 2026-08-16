# 2026-08-16 海运出口收发通折叠，备注改到货物区 Tab

## 背景意图

海运出口基础信息里收发通占位较高，内部/外部备注原先在收发通下方。对齐海运进口：收发通改为灰色折叠条（默认展开）；两个备注共用一块输入区、顶部 Tab 切换，并放到货物卡片件重尺右侧。

## 核心逻辑变更

1. **收发通折叠：** `partyExpanded` 默认 `true`；折叠用 `v-show`，复制到通知人、通知人标签切换仍在折叠内容内。
2. **备注位置：** 从收发通下方挪到 `cargo-main-layout__remark` 第三列。
3. **备注切换：** `CargoRemarkForm` 同时持有 `internalRemark` / `remark`，用 CSS 隐藏非当前 Tab。
4. **件重尺：** 标签改为水平排列，`labelWidth: 84`。
5. **文案：** 新增 `seaExport.export.externalRemark`。

## 避坑指南

- 折叠与 Tab 都不要用 `v-if`，否则会丢未保存内容。
- 新建 / 编辑共用 `basic-info-form/form.vue`。
