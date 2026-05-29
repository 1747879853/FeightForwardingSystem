# 海运服务项 ServiceType 枚举口径统一

## 背景意图

海运出口新建/编辑、港口服务项配置、工作台、客户排除服务项页面此前存在多套 `ServiceType` 枚举来源：部分页面走枚举中心，部分页面使用本地硬编码，且个别场景存在大小写回退（`serviceType`/`ServiceType`）。这会导致文案回显和映射维护成本上升，也增加口径漂移风险。

## 核心逻辑变更

1. 新增统一模块 `src/views/sea-export-admin/service-type.ts`，集中沉淀：
   - `SERVICE_TYPE_VALUE`（0~5 常量）
   - `DEFAULT_SERVICE_TYPE_OPTIONS`（兜底文案）
   - `loadSeServiceTypeOptions()`（统一调用 `getEnumItems('ServiceType')`）
   - `buildServiceTypeLabelMap()`（统一数值到文案映射）
2. `SeServiceConfigAdmin` 列表与弹窗改为复用统一模块，不再在页面内维护重复的 `ServiceType` 加载/兜底逻辑。
3. 工作台 `workspace` 移除本地 `SERVICE_TYPE_TEXT_MAP`，改为页面初始化时通过统一模块加载枚举并构建映射。
4. 客户编辑中的“海运出口服务项目”页改为复用统一模块加载 `ServiceType`，移除小写 `serviceType` 的历史回退分支。
5. 海运出口 `form.vue` 的服务项值映射（含代收支）改为引用 `SERVICE_TYPE_VALUE`，避免再次散落硬编码数字。

## 避坑指南

- `ServiceType` 统一使用枚举名 `ServiceType`（大写 S/T），不要再新增 `serviceType` 小写分支。
- `service-type.ts` 的兜底映射仅用于枚举未命中场景，业务口径仍以后端枚举中心为准。
- `form.vue` 中服务项卡片的“字段映射”与“枚举文案”是两层语义：前者控制业务字段绑定，后者控制展示文案，后续调整时需分别验证。
