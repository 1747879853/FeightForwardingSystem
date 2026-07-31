# 业务联系单列表分组统计

## 背景意图

后端新增 `PreOrderAdmin/GetGroupedListAsync`，查询条件与 `GetPagedListAsync` 一致，可按委托单位、船公司、起运港、目的港、业务类型分组并返回各分组条数。前端需在业务联系单列表接入与海运出口一致的分组看板交互。

## 核心逻辑变更

### API 层

- `PreOrderAdminApi` 新增 `PreOrderGroupField`（3/4/5/6/11）、`PreOrderGroupDto`、`GetGroupedListParams`。
- `PreOrderQueryParams` 补充 `CarrierId` 及 `CarrierIdEmpty` / `POLIdEmpty` / `PODIdEmpty`，供点击分组项（含「未填写」）后筛选列表。
- 新增 `getPreOrderGroupedList` → `GET /services/app/PreOrderAdmin/GetGroupedListAsync`。

### 列表页接入

- 复用 `#/components/list-grouping`（`GroupingSettings` / `GroupingTabs` / `useListGrouping`）。
- `PRE_ORDER_GROUP_FIELDS`：委托单位、船公司、起运港、目的港、业务类型。
- `normalizeQuery` 末尾 `grouping.decorateListParams`；船公司分组解析 `logo` 为 `logoUrl`。
- 持久化 key：`group_config_PreOrderList`；`autoLoad: false` + `restorePersistedField` 后再首查；`onActivated` 刷新分组。

## 避坑指南

1. **业务类型无搜索项**：`BizType` / `CarrierId` 搜索区可能没有对应表单项，启用分组时不影响搜索表单，但仍可通过 Tab 追加列表筛选。
2. **首查竞态**：列表 `keepAlive`，必须先恢复分组字段再 `submitForm`，否则首屏分组可能只剩「全部」。
3. **空值筛选**：点击 id 为 null 的「未填写」Tab 依赖后端 `*Empty` 参数；委托单位、业务类型未配 `emptyParamKey`。
