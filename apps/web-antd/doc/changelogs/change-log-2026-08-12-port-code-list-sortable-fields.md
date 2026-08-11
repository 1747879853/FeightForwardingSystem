# 港口代码列表列头排序对齐后端可排字段

## 背景意图

`PortCodeAdmin/GetPagedListAsync` 的 `Sorting` 作用于港口本表及 `Country.*` / `Lane.*` 导航属性。列表经 `applyDefaultSortable` 默认对有 `field` 的列开排序，国家/航线/大洲等 DTO 展示列若按列名直传会触发后端不支持排序；创建人昵称为后填充字段亦不可排。同时希望列表默认按国家中文名升序。

## 核心逻辑变更

1. **嵌套可排列**补 `sortField`（或对齐导航路径 `field`）：
   - 国家名称：`field: country.countryName` → `Country.CountryName`（与 `defaultSort` 解析字段一致，便于列头高亮）
   - 大洲：`Country.Chau`
   - 航线代码 / 航线名称：`Lane.Code` / `Lane.LaneName`
2. **本表可排列**保持默认驼峰→帕斯卡：`cnName`/`portName`/`portType`/`ediCode`/`statisticalArea`/`status`/`creationTime`。
3. **不可排序列**显式 `sortable: false`：`creatorUserName`（仅有 `CreatorUserId`，昵称后填充）。
4. 列表 `defaultSort` 设为 `Country.CountryName ASC`。

## 避坑指南

- `sorting` 走实体/导航路径，不是 DTO 扁平别名（如勿传 `CountryName`、`LaneCode`、`LaneName`）。
- 大洲列表虽直接展示 `row.chau`，排序仍须 `Country.Chau`。
- 新增列时先对照港口本表 / `Country.*` / `Lane.*` 再决定是否开排序；后填充或聚合列一律关掉。
