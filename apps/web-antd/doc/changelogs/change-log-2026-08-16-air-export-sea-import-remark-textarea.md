# 2026-08-16 空出/海进货物备注改为多行输入

## 背景意图

空运出口、海运进口货物区右侧的内部/外部备注，上一轮改成顶部 Tab 后用的是单行 `Input`。较长备注会被裁成一行，也无法对照左侧唛头/货描做多行录入。改为无边框 `Textarea`，并撑满备注卡片剩余高度。

## 核心逻辑变更

1. **组件：** `CargoRemarkForm` 的 `internalRemark` / `remark` 由 `Input` 改为 `Textarea`（`rows: 3`，`resize: none`）。
2. **样式：** 选择器从 `input.ant-input` 改为 `textarea.ant-input`；备注字段用 flex 撑满卡片，去掉原先给单行输入预留的底部大 padding。
3. **范围：** 空运出口、海运进口共用各自的 `basic-info-form/form.vue`，新建与编辑一起变。海运出口上一轮已是 textarea，本次不改。

## 避坑指南

- 不要改回 `Input`，否则长备注只能看到一行，且无法换行。
- 高度仍跟件重尺列底对齐；textarea 用 `height: 100%` + flex，不要再写死像素高度。
- Tab 切换仍用 CSS 隐藏，不要用 `v-if` 卸载字段。
