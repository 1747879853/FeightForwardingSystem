# 2026-07-25 业务联系单货物类型/品名对齐海运出口内联样式

## 背景意图

业务联系单新建/编辑页「货物与箱型」卡片原先把「货物类型」放在基础信息表单里，且缺少「品名」录入。需对齐海运出口基础信息页：货物类型与品名以内联控件形式挂在卡片标题栏右侧。

## 核心逻辑变更

1. **布局**：从基础信息 schema 移除 `cargoId`；新增 `usePreOrderCargoTypeInlineSchema`，在「货物与箱型」卡片 `#title` 内用 `cargo-type-inline-wrap` + `CargoTypeInlineForm` 展示「货物类型」「品名」，直接复用海运出口 `form.css` 中的内联样式类。
2. **品名字段**：表单内用 `orderCodeGoodss: number[]`（`CodeGoodsSelect` 多选），详情回显从 `preOrderCodeGoodss[].codeGoodsId` 映射；提交时再映射为 `preOrderCodeGoodss: { codeGoodsId }[]`。
3. **校验 / 只读**：`cargoTypeInlineFormApi` 纳入保存前校验与只读态 `disabled` 同步；货物类型默认 `0`（普通货）、`selectRequired`。

## 避坑指南

- 不要把表单字段名写成 `preOrderCodeGoodss` 再直接塞给 `CodeGoodsSelect`——组件要的是 id 数组；与后端子表 DTO 的映射只发生在 `fillFromDetail` / `buildSubmitPayload`。
- 内联样式依赖编辑页已 `scoped src` 引入的 `sea-export-admin/basic-info-form/form.css`，不要在预下单侧再抄一份同类 CSS。
