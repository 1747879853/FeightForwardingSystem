# 海运出口服务项顺序与编辑勾选口径对齐

## 背景意图

海运出口编辑页在服务项联动中存在两个体验偏差：一是节点展示和保存提交未按接口 `sortId` 排序；二是编辑态即使详情接口未返回 `seaExportServices`，也会被起运港默认勾选覆盖，导致“本单未勾选”的语义丢失。

## 核心逻辑变更

1. `src/views/sea-export-admin/form.vue` 新增统一服务项排序函数，服务节点渲染与 `serviceTypes` 提交都改为按接口 `sortId` 排序（缺失 `sortId` 时回退前端默认顺序）。
2. 服务项节点文案改为优先复用 `ServiceType` 枚举映射，不再依赖页面内硬编码文案，避免与枚举中心口径漂移。
3. 编辑态联动增加“详情勾选覆盖”机制：`loadEditData` 会把详情中的 `serviceTypes/seaExportServices` 勾选结果透传到服务项联动流程；当详情未返回服务项时，卡片保持可见但不勾选（灰态）。

## 避坑指南

- `/SeaExportAdmin/GetServiceTypesByPOLAsync` 的 `sortId` 决定展示与提交顺序，后续不要再在前端固定数组上直接组装 `serviceTypes`。
- 编辑态勾选来源优先级应明确为“详情 > 默认联动”，否则会把历史单据误判为已勾选。
- 服务项“可见范围”和“勾选状态”是两层语义：前者由起运港配置决定，后者在编辑页需以详情为准。
