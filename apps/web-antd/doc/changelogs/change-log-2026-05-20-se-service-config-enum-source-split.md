# 海运出口港口服务项配置枚举来源拆分

## 背景意图

在服务项配置弹窗中，`serviceType` 与 `SeaExportPropEnum` 分别承担“服务项类型选择”和“字段规则选择”两类语义。此前字段规则下拉误用了 `serviceType` 数据源，导致候选项不完整且语义混淆。

## 核心逻辑变更

1. 调整服务项配置弹窗的枚举加载逻辑，打开弹窗时并行拉取两个枚举：
   - `serviceType`：用于 `serviceType` 字段下拉；
   - `SeaExportPropEnum`：用于 `seServiceShows / seServiceLocks / seServiceRequires` 下拉。
2. `SeaExportPropEnum` 改为固定使用单一枚举键 `SeaExportPropEnum`，移除兼容别名读取，保证前后端枚举命名一致。
3. 保留 `serviceType` 的兜底逻辑：仅当接口未返回数据时，才回退使用外层传入选项，降低弹窗首次打开空白风险。

## 避坑指南

- `serviceType` 和 `SeaExportPropEnum` 不能共用同一枚举源，否则字段规则会出现“服务项类型值”污染。
- 若枚举管理中新增了 `SeaExportPropEnum` 项，需确保枚举缓存已刷新（可在枚举页更新后刷新页面）。
- 固定使用 `SeaExportPropEnum` 后，后端枚举名需与此前端键严格一致，避免因大小写或命名差异导致下拉为空。
