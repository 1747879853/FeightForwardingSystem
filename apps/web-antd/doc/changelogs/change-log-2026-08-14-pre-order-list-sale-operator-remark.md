---
title: 业务联系单列表-销售操作备注-2026-08-14
module: 业务联系单
author: auto-doc-sync
last_updated: 2026-08-14
---

# 背景意图

TAPD #1000794：业务联系单列表需要直接看到每票的销售、操作与备注，并支持按销售、操作、备注筛选。后端已在列表返回 `saleNames`/`operatorNames`，并支持 `SaleIds`/`OperatorIds`/`Remark` 筛选；前端列表此前未对接。

# 核心逻辑变更

1. **DTO**：`PreOrderDto` 增加 `saleNames`/`operatorNames`；`PreOrderQueryParams` 增加 `SaleIds`/`OperatorIds`/`Remark`。
2. **筛选**：列表搜索增加销售、操作（`UserSelect` 多选）与备注（模糊）；空数组/空串不传参。
3. **列**：表格在货好时间后增加销售、操作、备注列；昵称数组以 `、` 拼接展示。
4. **下拉范围**：销售/操作下拉分别传 `userAttribute = Sale(16)` / `Operation(1)`，与海出列表一致，只出对应属性用户。

# 避坑指南

- `SaleIds`/`OperatorIds` 传的是**用户 id**，不是干系人子表行 id；多选为「命中任一」。
- 销售与操作两个条件之间是 AND；与数据权限无关，无权限仍会空结果。
- `saleNames`/`operatorNames` 仅为昵称快照，不带用户 id；需要 id 时走详情 `preOrderUsers`。
- 下拉的 `userAttribute` 只约束候选用户列表，不影响列表接口本身的筛选语义。
