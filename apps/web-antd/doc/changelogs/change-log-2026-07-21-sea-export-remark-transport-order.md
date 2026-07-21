# 海运出口内外部备注统一走 TransportOrder

## 背景意图

表单「内部备注 / 外部备注」应对齐后端 `TransportOrder` 契约：`internalRemark`、`remark` 均在运输单上。此前外部备注误从 `SeaExport.remark` 回填，并写入海出根级 DTO，导致与运输单字段不一致。

## 核心逻辑变更

1. **提交**（`use-sea-export-submit.ts`）：`remark` 从海出根字段移入 `transportOrder`，与 `internalRemark` 同层。
2. **详情回填**（`sea-export-detail-mapper.ts`）：外部备注改为读取 `transportOrder.remark`。
3. **AI 提取**（`ai-extract-utils.ts`）：`remark` 改为从 `transportOrder.remark` 赋值。
4. **列表**（`data.ts`）：内部备注列已为 `transportOrder.internalRemark`；补外部备注列 `transportOrder.remark`；筛选区拆分 `InternalRemark` / `Remark`（标签分别为内部备注、外部备注）。
5. **审核遗留**：`expense-submission/detail.vue`、`expense-all/detail-back.vue` 的 `flattenDetail` 外部备注改为 `to?.remark`；`audit-approval/data.ts` 货物 schema 内外备注标签与海出对齐（字段名仍为表单扁平 `internalRemark`/`remark`，语义属运输单）。

## 避坑指南

- 勿再把表单外部备注写入 `SeaExportAddDto` / `SeaExportEditDto` 的根级 `remark`；该根字段若仍存在于契约，与表单「外部备注」不是同一业务语义入口。
- 列表展示与筛选：内部备注列/筛选用 `transportOrder.internalRemark` / `InternalRemark`；外部备注列/筛选用 `transportOrder.remark` / `Remark`（勿绑海出根级 `remark`）。
