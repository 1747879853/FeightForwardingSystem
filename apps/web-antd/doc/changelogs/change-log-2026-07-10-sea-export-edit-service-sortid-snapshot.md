# 海运出口编辑页服务项目与 POL 配置解耦

**修改时间：** 2026-07-10

## 背景意图

业务要求：POL 配置仅用于**新增**页渲染服务项目；编辑页本单已生成 `seaExportServices` 后，起运港/委托单位变更或 POL 重查不得再影响流水线展示、勾选与 `sortId` 分组。

## 核心逻辑变更

1. 新增 `buildServiceTypeNodesFromDetail` / `applyServiceTypeStateFromDetail`：编辑态仅按详情 `seaExportServices` 构建节点（含任务态与 sortId）。
2. `syncServiceTypesByPol` / `queueSyncServiceTypesByPol` 在 `isEdit` 时直接返回，不再请求 `GetServiceTypesByPOLAsync`。
3. `loadEditData` 改为调用 `applyServiceTypeStateFromDetail`，移除编辑态 POL 联动。
4. `showServiceItemContent` 编辑态仅依赖本单节点是否已加载，不再要求 POL 配置就绪。

## 避坑指南

- 新建页逻辑不变：仍由 POL + 委托单位排除项决定可见范围与默认勾选。
- 编辑页保存/完成服务后需 `loadEditData` 刷新快照，以同步任务状态与后端最新服务项。
