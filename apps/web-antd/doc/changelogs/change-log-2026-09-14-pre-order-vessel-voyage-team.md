# 业务联系单船名航次车队

## 背景意图

主表补齐船名、航次、车队，与海运进出口/业务主表审核通过带入字段对齐。列表要能看见船名航次、按车队筛、用关键字搜船名航次；车队不进列表列。

## 核心逻辑变更

- 表单：船名/航次用 `VesselVoyageInput` 合成一格（`vessel` + 隐藏 `innerVoyno`）；车队用 `ClientSelect`（`industryCategory=i`）。
- 长度：海运进口各 ≤32，其余业务各 ≤64；切业务类型会刷新 maxlength。
- 详情回填 `vessel`/`innerVoyno`/`teamId`，车队注入 `selectedItems`；清空后随 Add/Edit 全量提交即可解除。
- 列表列只加 `vessel`、`innerVoyno`；筛选加 `TeamId`；关键字 placeholder 写明可搜船名/航次。
- 列表**不加车队列**。接口虽返回 `team`，产品口径是筛不用列，和海出/海进一致。

## 避坑指南

- `VesselVoyageInput` 的 `componentProps` 必须是函数，否则航次回显会丢。
- 以后若要加车队列，`field` 直接绑 `team.name`，不要用 formatter 去取旧平铺名。
- 关键字不搜车队名；车队只走 `TeamId`。
- AI 识别只回填船名/航次，不回填车队。
