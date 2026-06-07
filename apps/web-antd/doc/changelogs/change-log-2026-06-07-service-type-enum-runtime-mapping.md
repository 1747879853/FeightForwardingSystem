# ServiceType 枚举改为运行时取值

## 背景意图

海运出口/海运进口基础信息页以及工作台此前仍存在 `ServiceType` 的本地兜底常量（包含 `0~5` 值和中文名称）。这会在枚举中心调整后产生前端展示或勾选口径漂移，尤其影响 `DetailAsync` 回显与服务项勾选的稳定性。

## 核心逻辑变更

1. `src/views/sea-export-admin/service-type.ts` 去除本地硬编码 `SERVICE_TYPE_VALUE` 与 `DEFAULT_SERVICE_TYPE_OPTIONS`，统一改为从 `getEnumItems('ServiceType')` 构建：
   - `ServiceType` options（`value + displayName`）
   - `value -> displayName` 映射
   - 通过 displayName 反查 value 的工具函数 `resolveServiceTypeValueByLabels`
2. 海运出口与海运进口表单（`sea-export-admin/form.vue`、`sea-import-admin/form.vue`）去除写死的服务项数值映射，改为页面初始化时动态加载 `ServiceType` 枚举并生成字段映射，再用于：
   - `serviceTypes` 勾选/回填
   - 服务项联动匹配
   - 编辑态 `DetailAsync` 返回 `seaExportServices` 的 `serviceType` 解析
3. 工作台（`dashboard/workspace/index.vue`、`workbench-data.ts`）移除本地 ServiceType 默认文案表，展示名称统一依赖 `getEnumItems('ServiceType')` 的 `displayName`。

## 避坑指南

- `serviceTypes` 业务判断不要再依赖本地固定值常量，统一通过运行时枚举映射后再比较。
- `DetailAsync` 回显和 `GetServiceTypesByPOLAsync` 联动都必须使用同一份运行时映射，避免“勾选口径”和“展示口径”分叉。
- 若枚举中心关闭某个服务项（`enable=false`），前端会按当前枚举结果收敛映射，发布前需确认后台枚举配置完整。
