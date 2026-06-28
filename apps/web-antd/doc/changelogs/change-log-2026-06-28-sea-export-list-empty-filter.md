# 海运出口列表「未填写」分组项筛选对接

## 背景意图

分组统计接口对船公司、起运港、目的港、付费方式、签单方式等可空字段分组时，未填写记录会落入 `id`/`name` 均为 null 的分组项。此前点击该「未填写」分组项时，列表查询无法表达「查空值」条件，会错误地返回全部数据。后端 `SeaExportQueryDto` 新增 5 个 `*Empty` 布尔筛选字段，前端需对接：点击未填写分组项时传 `{ [对应Empty字段]: true }`。

## 核心逻辑变更

### API 层 `api/sea-export/sea-export-admin.ts`

`GetPagedListParams` 新增 5 个可空字段未填写筛选参数（仅传 `true` 时生效，与同名 id 参数互斥）：

| 参数                   | 对应字段                    | 分组 GroupField |
| ---------------------- | --------------------------- | --------------- |
| `CarrierIdEmpty`       | `SeaExport.CarrierId`       | 4 船公司        |
| `POLIdEmpty`           | `SeaExport.POLId`           | 5 起运港        |
| `PODIdEmpty`           | `SeaExport.PODId`           | 6 目的港        |
| `CodeFrtIdEmpty`       | `TransportOrder.CodeFrtId`  | 8 付费方式      |
| `CodeIssueTypeIdEmpty` | `SeaExport.CodeIssueTypeId` | 9 签单方式      |

### 通用分组模块 `components/list-grouping/`

- `GroupFieldDef` 新增可选 `emptyParamKey`：可空字段「未填写」分组项对应的列表查询参数名。
- `useListGrouping.decorateListParams` 选中项改为三态处理：
  - `undefined`（全部）→ 不追加筛选；
  - `null`（未填写分组项）→ 若字段配置了 `emptyParamKey`，追加 `{ [emptyParamKey]: true }`，否则不追加；
  - 具体值 → 追加 `{ [paramKey]: 值 }`。

### 海运出口列表 `views/sea-export-admin/list.vue`

`SEA_EXPORT_GROUP_FIELDS` 为 5 个可空字段补充 `emptyParamKey`（船公司/起运港/目的港/付费方式/签单方式）；装运方式、订单类型、委托单位、船名为非可空字段，不配置。

## 避坑指南

1. **未填写筛选改为 `*Empty=true`**：修复了点击未填写分组项返回全部数据的缺陷；空值分组的 `id` 为 null，需与「全部」(undefined) 区分。
2. **三态区分**：`selectedItemId` 的 `undefined`（全部）/`null`（未填写）/具体值 三态不可用 `!value` 合并判断。
3. **互斥保证**：分组启用时同名搜索项已被禁用并清空，点击未填写项只追加 `*Empty`，不会与 id 参数同时传入，符合后端互斥校验。
4. **仅可空字段配置 emptyParamKey**：非可空字段（装运方式等）即使出现 null 分组项也不追加筛选。
