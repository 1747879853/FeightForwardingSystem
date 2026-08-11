# 业务联系单中转港字段名对齐 poT1Id

- 日期：2026-08-11
- 类型：Fix
- 影响页面：`/pre-order/add`、`/pre-order/:id/edit`
- 关联缺陷：TAPD [#1161580498001000680](https://www.tapd.cn/61580498/bugtrace/bugs/view/1161580498001000680)（中转港保存后无效，刷新消失）

## 一、背景意图

业务联系单选了中转港并保存后，刷新/重新拉详情中转港为空。根因是前端表单与 DTO 使用了 `pot1Id`/`pot2Id`/`pot1Remark`/`pot2Remark`，而 `PreOrderAdmin/DetailAsync`（及 Add/Edit）实际 JSON 字段与海运出口一致，为 `poT1Id`/`poT2Id`/`poT1Remark`/`poT2Remark`。JavaScript 属性大小写敏感，回填读 `dto.pot1Id` 恒为 `undefined`，保存后 `loadDetail` 把已选值冲掉。

## 二、核心逻辑变更

1. `api/pre-order/pre-order-admin.ts`：`PreOrderDto` / `PreOrderAddDto` 中转港字段改为 `poT1Id`/`poT2Id`/`poT1Remark`/`poT2Remark`。
2. `views/pre-order/form-data.ts`：港口 schema 与 `PRE_ORDER_PORT_REMARK_FIELDS` 同步改名。
3. `views/pre-order/editor.vue`：中转港 Tab、回填 `setValues`、提交换名；详情回填用 `toPortObjectSelectedItems` 注入港口 `selectedItems`（对象字段仍为 `pot1`/`pot2`）；回填后重跑 `applyTransitPortTabSchema` 稳住 Tab Teleport。

## 三、避坑指南

- **不要再写 `pot1Id`**：后端 C# 属性为 `PoT1Id`，camelCase 序列化结果是 `poT1Id`（大写 T），不是全小写 `pot1Id`。
- **对象字段仍是 `pot1`/`pot2`**（小写 t），与海出一致；Id 字段与对象字段大小写不一致，映射时勿混用。
- 历史文档曾误写「业务联系单 DTO 是 pot1Id」；以接口实返回为准。
