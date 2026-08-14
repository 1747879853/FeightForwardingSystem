# 2026-08-14 付费申请选费港口改读业务类型简要

## 背景意图

`GetOrderFeeGroupAsync` 删除费用分组根级港口字段，改为按 `bizType` 返回互斥的 `seaExport`、`seaImport`、`airExport` 业务简要对象。前端需切换取数路径，避免接口升级后起运港、目的港列为空。

## 核心逻辑变更

- `PayAppFeeGroupDto` 删除根级 `pol`、`pod`、`polRemark`、`podRemark`、`signingPort`、`prepareAt`、`pot1`、`pot2`、`receivePort`、`deliverPort` 声明。
- 新增海运出口、海运进口、空运出口业务简要 DTO，以及船公司、空运港口简要 DTO。
- 起运港和目的港展示按 `bizType` 读取：
  - `0`：`seaExport.polRemark` / `seaExport.podRemark`
  - `1`：`seaImport.polRemark` / `seaImport.podRemark`
  - `2`：`airExport.polRemark` / `airExport.podRemark`
- 保持现有展示口径：备注为空时不回退港口名称。

## 避坑指南

- 三个业务简要对象互斥，不能固定读取 `seaExport`，否则海运进口与空运出口仍无港口信息。
- 空运中转地仅为 `airExport.pot`，不能按旧 `pot1` / `pot2` 处理。
- `signingPort`、`prepareAt`、收货地和交货地等字段本接口不再返回；页面需要时应另调对应业务详情接口。
- `polId` / `podId` 入参筛选仍只覆盖海运出口，本次未扩展。
