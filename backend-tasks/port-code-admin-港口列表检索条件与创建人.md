# PortCodeAdmin 后端任务：港口列表检索条件与创建人

## 背景

TAPD #0655：港口管理需增加检索条件（港口查询/航线/EDI/国家）及列表「创建人」列。前端已对接下列查询参数与展示字段，需后端 `PortCodeAdmin/GetPagedListAsync` 对齐。

## 接口

`GET /api/services/app/PortCodeAdmin/GetPagedListAsync`

## 查询参数（在现有 `Keyword`/`Status`/`PageIndex`/`PageSize`/`Sorting` 上追加）

| 参数 | 类型 | 说明 |
| --- | --- | --- |
| `Keyword` | string? | 模糊匹配港口英文名 `PortName`、中文名 `CnName`（文案已改为「港口查询」） |
| `LaneId` | long? | 精确匹配航线 |
| `EdiCode` | string? | 模糊匹配 EDI 代码 |
| `CountryId` | long? | 精确匹配国家 |
| `Status` | int? | 已有：0 启用 / 1 禁用 |

## 列表出参

| 字段 | 说明 |
| --- | --- |
| `creatorUserName` | 创建人昵称（由 `CreatorUserId` 解析；可与费用代码等基础资料一致） |
| `creatorUserId` | 已有则可保留 |

## 验收

- [ ] 仅传 `Keyword=上海` 能筛到中文名含「上海」的港口
- [ ] 传 `LaneId` / `CountryId` / `EdiCode` 各自生效，可与 `Keyword`、`Status` 组合
- [ ] 列表项含 `creatorUserName`（无创建人时为空或 null）

## 前端已改

- `apps/web-antd/src/api/system/base-data/port-code-admin.ts`
- `apps/web-antd/src/views/system/basic-data/PortCodeAdmin/data.ts`
- `apps/web-antd/src/views/system/basic-data/PortCodeAdmin/list.vue`
