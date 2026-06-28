# 海运出口列表分组统计与可复用分组组件

## 背景意图

后端新增 `GetGroupedListAsync` 分组统计接口，查询条件与海运出口列表一致，可按装运方式、订单类型、委托单位等 9 个维度对筛选结果分组并返回各分组条数。前端需在列表页提供与运价列表航线 Tab 类似的分组展示，并支持「搜索条件与分组互斥、点击分组项仅过滤列表不刷新分组」的交互，同时为后续其他列表模块复用做好抽象。

## 核心逻辑变更

### API 层

- `SeaExportAdminApi` 新增 `SeaExportGroupField` 枚举（1~9）、`SeaExportGroupDto`、`GetGroupedListParams`。
- 新增 `getSeaExportGroupedList` → `GET /services/app/SeaExportAdmin/GetGroupedListAsync`。
- `GetPagedListParams` 补充 `CodeFrtId`，供点击「付费方式」分组项后筛选列表。

### 可复用分组模块 `src/components/list-grouping/`

| 文件 | 职责 |
| --- | --- |
| `types.ts` | `GroupFieldDef`（分组字段定义）、`GroupItem`（分组项） |
| `use-list-grouping.ts` | 通用 composable：启用/关闭分组、互斥禁用搜索项、签名比对决定是否刷新分组数据、点击分组项追加列表筛选 |
| `grouping-settings.vue` | 「分组设置」弹层（单选 radio + 不分组），放置于工具栏「搜索项设置」旁 |
| `grouping-tabs.vue` | 分组 Tab 条（横向滚动，样式对齐 freight-rate 航线 Tab） |

### 海运出口列表接入

- `list.vue` 定义 `SEA_EXPORT_GROUP_FIELDS`（9 个分组字段 → `paramKey` 映射）。
- `normalizeQuery` 末尾调用 `grouping.decorateListParams(baseParams)`。
- 启用分组时：`#toolbar-actions` 渲染 `GroupingTabs`，表格标题置空；`#toolbar-tools` 末尾渲染 `GroupingSettings`。

### 交互约定

1. **同时只启用一个分组字段**。
2. **搜索与分组互斥**：启用某分组后，自动禁用并清空对应搜索项（如起运港分组 → 禁用 `POLId`）；切换/关闭分组时恢复。
3. **分组数据仅随顶部搜索条件刷新**：对搜索参数做签名比对，仅签名变化时重新拉取分组并重置选中项；点击 Tab 只重查列表。
4. **点击分组项追加列表筛选**：如选中某起运港 Tab，列表查询追加 `POLId`，分组数据不变；「全部」清除该筛选。

## 后续模块接入方式

```ts
const grouping = useListGrouping({
  fields: /* 各自的 GroupFieldDef[] */,
  getGridApi: () => gridApi,
  fetchGroups: (baseParams, field) =>
    yourGroupedApi({ ...baseParams, GroupField: field }),
});
// normalizeQuery 末尾 return grouping.decorateListParams(baseParams)
// 模板放 <GroupingSettings/> 与 <GroupingTabs/>
```

## 避坑指南

1. **分组与搜索互斥**：`paramKey` 需与搜索表单 `fieldName` 一致；付费方式分组使用 `CodeFrtId`，搜索区无对应项，启用时不影响搜索表单。
2. **分组刷新时机**：勿在点击 Tab 时调用分组接口；仅 `decorateListParams` 检测到搜索签名变化时才刷新。
3. **列表筛选参数**：点击分组项追加的是 `paramKey` 对应字段；需确认后端 `GetPagedListAsync` 支持该参数（付费方式依赖 `CodeFrtId` 后端支持）。
4. **标题区域**：启用分组后隐藏「海运出口列表」标题，Tab 占据 `toolbar-actions` 左侧，与 freight-rate 航线 Tab 布局一致。
