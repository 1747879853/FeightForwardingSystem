# 2026-08-09 业务联系单费用代码回显优先用 cnName

## 背景意图

业务联系单费用表保存后重新打开，费用代码下拉显示数字 id（如 `143`）而非「海运费」。详情接口 `preOrderFees[].feeCode` 已返回 `cnName`，但前端回显只读了不存在的 `name`。对应 TAPD：[#0717](https://www.tapd.cn/61580498/bugtrace/bugs/view/1161580498001000717)。

## 核心逻辑变更

- 文件：`apps/web-antd/src/views/pre-order/modules/fee-table.vue`
- `feeCodeSelectedItems`：`cnName` 改为 `feeCode.cnName || name || enName`，并带上 `enName` 供兜底
- `currencySelectedItems`：同样按详情 `currency.cnName` 对齐（接口无平铺 `name`）

## 避坑指南

- `FeeCodeSelect` 的选中展示走 `option-label-prop="rowLabel"`（即 `cnName`），`selectedItems` 若 `cnName` 为空会直接露出 `value`（id）
- 详情 `SimpleNamedDto` / 费用代码对象常见字段是 `cnName`，不要假定一定有 `name`
