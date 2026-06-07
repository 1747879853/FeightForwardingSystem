# 变更记录：海运出口服务项目枚举驱动 + 执行方独立改造

> 日期：2026-06-07  
> 范围：`form.vue`、`service-type.ts`、`sea-export-admin.ts`

## 背景意图

原实现通过中文 label 别名将固定执行方字段（订舱代理、车队等）桥接到 `ServiceType` 枚举，导致枚举改名即失效、代收支特判复杂、勾选状态与执行方字段强耦合。本次按解析日志 11 项决策，将流水线节点改为枚举驱动，执行方字段完全独立。

## 核心逻辑变更

1. **数据模型**：新增 `ServiceTypeNode { serviceType, label, sortId, checked, taskStatus?, taskId? }`，由 `getServiceTypesByPOL` + `ServiceType` 枚举 displayName 构建。
2. **回填来源**：勾选与任务状态改读 `detail.seaExportServices[]`，不再从 `detail.serviceTypes` 或多路径捞数。
3. **提交口径**：`serviceTypes` 由 `serviceTypeNodes.filter(n => n.checked)` 生成；执行方五字段（`bookingAgentId`/`teamId`/`custBrokerId`/`warehouseId`/`insuranceId`）始终全量显示并独立提交。
4. **删除桥接层**：移除 `SERVICE_TYPE_LABEL_ALIASES`、`serviceTypeValueByField`、`serviceTypeToFieldMap`、`*Enabled` 勾选字段、`organizationUnits` 提交及代收支 UI。
5. **类型对齐**：`SeaExportDto` 新增 `seaExportServices`，删除不返回的 `serviceTypes` 字段。

## 避坑指南

- 编辑态勾选覆盖：进入编辑页后 `syncServiceTypesByPol` 必须传 `savedServiceTypeSet` + `taskMap`，否则会被客户维度默认勾选覆盖。
- 已有 `seServiceTask`（含 `taskId`）的节点不可关闭，与任务状态（待处理/已处理）是两套展示维度。
- AI 识别不再处理 `serviceTypes`，仅写执行方字段；节点勾选由 POL 配置决定。
- `seServiceShows` / `seServiceLocks` / `seServiceRequires` 联动逻辑本次未动，必填校验仍按 serviceType 维度的 `seServiceRequires` 映射。
