# 2026-08-05 新增空运港口基础资料与 AirPortSelect 业务下拉

## 背景意图

后端交付了空运港口（机场）模块：管理端 5 个接口 + 业务端 1 个分页接口。前端需要补齐对应的基础资料维护页面，并提供一个业务下拉组件，供后续空运出口/进口委托与空运运价选择起运/目的机场。

机场以 IATA 三字码为业务识别核心，可选关联国家资料；国家删除接口同步增加了空运港口引用校验。

## 核心逻辑变更

### 1. API 层（新增）

`apps/web-antd/src/api/system/base-data/air-port-admin.ts` 单文件双命名空间，与 `port-code-admin.ts` 的分层习惯一致：

- `AirPortApi`：业务端精简 DTO `AirPortSelectDto`、分页响应，以及**管理端与业务端共享**的 `GetPagedListParams`（`Keyword` / `Status` / `CountryId` / `PageIndex` / `PageSize`）。
- `AirPortAdminApi`：管理端 `AirPortDto` / `AirPortAddDto` / `AirPortEditDto`，`GetPagedListParams` 直接 type 别名复用业务端定义。
- 请求函数：`getAirPortPagedList`（业务端 `AirPort/GetPagedListAsync`）、`getAirPortAdminPagedList`、`getAirPortDetail`、`addAirPort`、`editAirPort`、`deleteAirPort`（DELETE 带 `{ data: { id } }`）。

### 2. 管理页面（新增）

`views/system/basic-data/AirPortAdmin/` 三件套，沿用 `PortCodeAdmin` 的 `useVbenVxeGrid` + `useVbenModal` 模式：

- `data.ts`：搜索区为 `Keyword` / `CountryId`（复用 `CountrySelect`）/ `Status`；表单含三字码、英文名称、机场名称、ICAO 码、国家、城市、时区、状态、排序、备注。
- `list.vue`：分页代理走 `createPagedListQuery(getAirPortAdminPagedList)`，操作列 `edit` / `delete`。
- `modules/form.vue`：编辑为全量提交，空值显式转 `null`。

### 3. 业务下拉（新增）

`adapter/component/biz-select/air-port-select.vue`，基于 `usePagedSelect`：

- 数据源为业务端 `AirPort/GetPagedListAsync`，`queryKey: ['air-port']`。
- 支持 `countryId` 精确筛选（通过 `extraParamsRef`，变化即重置分页重新请求）。
- 选项双行展示：第一行 `三字码/英文名称`，第二行 `国家英文名 / 城市 / 中文名称`。
- 注册到 `ComponentType` 与 `initComponentAdapter`，可在表单 schema 中直接 `component: 'AirPortSelect'`。

### 4. 路由与国际化

- `router/routes/modules/basic-data.ts`：新增 `/basic-data/air-port`（`BasicDataAirPort`，图标 `mdi:airplane-takeoff`），父级 `BasicData` 的 `authority` 数组补 `Admin.AirPort`。
- `locales/langs/{zh-CN,en-US}/system.json`：新增 `system.basicData.airPort.*`。
- `locales/langs/{zh-CN,en-US}/auth.json`：新增 `Admin_AirPort` 及 `_Add/_Delete/_Edit/_Get`。

## 避坑指南

1. **编辑是全量提交。** `EditAsync` 按传入值覆盖所有字段，选填字段传 `null` 即清空。因此 `AirPortAddDto` 的选填文本字段类型放宽为 `null | string`，表单用 `toNullableText` / `toNullableNumber` / `toNullableId` 显式产出 `null`，不要靠省略字段来"保持原值"——那样同样会被清空。

2. **列表所有列必须 `sortable: false`。** 后端固定 `SortId DESC, Id DESC`，不接受前端排序字段。`useVbenVxeGrid` 会对远程分页表格自动给列加上 `sortable: true`，若不显式关掉，用户点击列头后 `Sorting` 被后端忽略，表格排序指示与实际数据顺序不一致。

3. **`country` 可能为 `null`。** 机场允许不挂国家。列表「国家名称」列用 `formatter: ({ row }) => row.country?.countryName ?? ''`，下拉第二行同样判空后再拼接。

4. **不要试图拉全量机场。** 系统只有分页接口，关键字一律交给后端。已选机场不在当前页时，`AirPortSelect` 按 id 调 `AirPortAdmin/DetailAsync`（仅需登录）补全 option，`loadedSelectedIds` 去重避免重复请求。

5. **`countryId` 是大数 ID。** 经 `json-bigint` 解析后为 string，比较统一 `String()`，提交原样透传，禁止 `Number()`（见 `.cursor/rules/bigint-id-precision.mdc`）。

6. **时区允许小数且有绝对值上限。** `timeZone` 支持 `5.75` 这类值，后端要求绝对值小于 100，表单 `InputNumber` 设 `precision: 2`、`step: 0.25`、`min/max: ±99.99`；列表格式化为 `UTC+8` 形式展示。

7. **国家删除会被本模块拦截。** 国家被空运港口引用时，`CountryCodeAdmin/DeleteAsync` 返回 `该国家信息已被【空运港口】模块引用,禁止删除`，多个引用方以「、」拼接。测试国家删除时需注意这条新增校验。
