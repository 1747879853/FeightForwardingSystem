# 港口管理 - 列表检索条件与创建人列

## 背景意图

TAPD #0655：港口管理检索过弱，需支持港口中英文名查询、航线、EDI、国家筛选，并在列表展示创建人。

## 核心逻辑变更

- 搜索区：「关键字」改为「港口查询」，placeholder 标明支持港口英文/中文名称。
- 新增筛选项：`LaneId`（`LaneSelect` 航线中文名）、`EdiCode`、`CountryId`（`CountrySelect`）。
- 列表在状态后增加「创建人」列（`creatorUserName`）。
- API 类型 `GetPagedListParams` / `PortCodeDto` 同步补齐上述字段。

## 避坑指南

- 筛选生效依赖后端 `PortCodeAdmin/GetPagedListAsync` 识别 `LaneId`/`EdiCode`/`CountryId`，并返回 `creatorUserName`；详见 `backend-tasks/port-code-admin-港口列表检索条件与创建人.md`。
- `LaneId`/`CountryId` 保持 string|number 透传，勿 `Number()`。
- `Keyword` 字段名未改，仅改展示文案，避免破坏已有后端关键字匹配。
