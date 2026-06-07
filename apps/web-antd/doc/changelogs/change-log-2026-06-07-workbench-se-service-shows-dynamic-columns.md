# 工作台海运出口业务列表按 seServiceShows 动态列

## 背景意图

工作台「海运出口服务」业务列表原先固定展示船名/航次、起运/目的港、箱量/箱型、ETD 等列，与港口服务项配置中的 `seServiceShows`（展示字段）未联动。切换 chevron 服务项节点时，列表列应随当前服务项配置的 `SeaExportPropEnum` 变化。

## 核心逻辑变更

1. 新增 `workbench/se-service-show-columns.ts`：全量 `SeaExportPropEnum`（1~17 + 1001~1017）取值注册表，`buildDynamicColumns` 按 `activeConfigItem.seServiceShows` 顺序组装可见列；表头使用 `getEnumItems('SeaExportPropEnum')` 的 `displayName`。
2. `BusinessRow` 增加 `seaExport` 原始对象，动态列从 `SeaExportDto` 统一取值；ID 类枚举显示 ID，Name 类显示名称，日期格式化为 `YYYY-MM-DD`，空值 `--`。
3. `WorkbenchBusinessTable` 增加 `dynamicColumns` prop：海运出口 Tab 传入动态列；审核 Tab 不传，保持原有固定列。
4. 列顺序：`[多选] → 委托单号 → [动态业务列…] → 处理人 → 被转交人`；`seServiceShows` 为空时仅显示固定列。

## 避坑指南

- 未在前端注册映射的枚举会静默跳过（M1），扩展枚举时需同步更新 `PROP_VALUE_RESOLVERS`。
- 箱量/箱型暂无对应 `SeaExportPropEnum`，本次不展示，待后端扩展枚举后再接入。
- 审核 Tab 勿传 `dynamicColumns`，否则会误走动态列模式。
