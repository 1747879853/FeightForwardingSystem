# 2026-07-25 业务联系单货物与箱型改为左右布局并对齐海出增删图标

## 背景意图

「货物与箱型」卡片原先上下排列（计量表单在上、箱型表在下），添加/删除也是文字按钮。需改为：左侧箱型列表、右侧竖排件数/包装/毛重/尺码；增删按钮改用海运出口同款 `mdi:add-box` / `mdi:close-box` 图标按钮。

## 核心逻辑变更

1. **布局**：`editor.vue` 使用已有 `cargo-main-layout`（左宽右窄）。左侧挂 `CtnTable`，右侧挂 `CargoForm`；`CargoForm` 的 `wrapperClass` 改为 `cargo-metrics-wrap … grid-cols-1`，schema 项补 `cargo-metrics-item--*`，垂直排列对齐海出计量列。
2. **箱型操作**：`ctn-table.vue` 去掉「添加箱型 / 删除」文字按钮，改为标题栏「箱型箱量」+ 海出同款 Iconify 图标按钮（蓝底加号、红/灰叉号，未选行时删除禁用）；只读态隐藏操作按钮并去掉行选择。
3. **样式**：标题栏浅色条本地 scoped，不依赖海出 `cargo-ctn-section` 负边距通栏，适配左右分栏场景。

## 避坑指南

- 左右布局复用海出 `form.css` 的 `cargo-main-layout*` / `cargo-metrics-wrap`，不要再写一份同等 flex；预下单左侧放的是箱型表而非唛头/货描，因此不会踩到 `cargo-main-wrap` 的 5 列 grid 覆盖规则。
- 图标按钮文案走 `$t('seaExport.export.addCtn')` / `$t('common.delete')`，与海出保持一致，避免再硬编码中文 Tooltip。
