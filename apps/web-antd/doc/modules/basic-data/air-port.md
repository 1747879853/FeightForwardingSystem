---
title: 空运港口
module: 基础资料
author: auto-doc-sync
last_updated: 2026-08-05
---

# 1. 业务背景说明 (Background)

**白话解释：** 维护空运机场（空运港口）资料，为后续空运出口/进口委托、空运运价提供起运机场、目的机场等字段的选择来源。机场以 IATA 三字码为业务识别核心（如 PVG / PEK），可选挂到国家资料上。

**路由与源码定位：**

| 项目 | 内容 |
| :-- | :-- |
| 页面路由 | `/basic-data/air-port` |
| 路由名称 | `BasicDataAirPort` |
| 页面组件 | `src/views/system/basic-data/AirPortAdmin/list.vue` |
| 权限口径 | Admin.AirPort / Admin.AirPort.Get |
| 关键源码 | `src/router/routes/modules/basic-data.ts`<br/>`src/views/system/basic-data/AirPortAdmin/list.vue`<br/>`src/views/system/basic-data/AirPortAdmin/data.ts`<br/>`src/views/system/basic-data/AirPortAdmin/modules/form.vue`<br/>`src/api/system/base-data/air-port-admin.ts`<br/>`src/adapter/component/biz-select/air-port-select.vue` |

**接口一览：**

| 接口 | 方法 | 权限点 | 用途 |
| :-- | :-- | :-- | :-- |
| `AirPortAdmin/GetPagedListAsync` | GET | 仅需登录 | 管理端分页列表 |
| `AirPortAdmin/DetailAsync` | GET | 仅需登录 | 详情（编辑回显、下拉回显兜底） |
| `AirPortAdmin/AddAsync` | POST | `Admin.AirPort.Add` | 新增 |
| `AirPortAdmin/EditAsync` | PUT | `Admin.AirPort.Edit` | 编辑（全量提交） |
| `AirPortAdmin/DeleteAsync` | DELETE | `Admin.AirPort.Delete` | 软删除 |
| `AirPort/GetPagedListAsync` | GET | 仅需登录 | 业务端 `AirPortSelect` 分页数据源 |

# 2. 功能与操作说明 (Features & Operations)

- **列表维护：** 在「基础数据 → 空运港口管理」页面按关键字、国家、状态筛选，并完成新增、编辑、删除。关键字为后端模糊匹配，覆盖三字码、英文名称、机场名称、ICAO 码、城市、备注以及所属国家的代码与中英文名称。
- **弹窗表单：** 通过 `AirPortAdmin/modules/form.vue` 维护明细，字段布局为纵向单列，国家使用已有的 `CountrySelect`。
- **业务复用：** 新增 `AirPortSelect` 业务下拉（注册名 `AirPortSelect`），走业务端 `AirPort/GetPagedListAsync`，供空运单据选机场使用。支持 `countryId` 精确筛选、关键字远程搜索、滚动分页加载。

# 3. 状态流转说明 (Status Transitions)

| 当前状态 | 触发人/动作 | 目标状态 | 状态说明 |
| :-- | :-- | :-- | :-- |
| 页面初始 | 用户进入路由 | 页面可用 | 由静态路由 + `abpPageAuthority('Admin.AirPort')` 权限守卫完成组件挂载。 |
| 启用（status=0） | 管理员编辑改为禁用 | 禁用（status=1） | 业务端下拉**仍会返回**禁用机场，由前端置灰（`disabled`），不隐藏。 |
| 已存在 | 管理员删除 | 软删除 | 删除后该机场的三字码与英文名称被释放，可重新录入相同编码。 |

# 4. 核心字段说明 (Field Definitions)

| 字段名 | 📖 字段含义说明 | 🔌 数据来源 (接口/字典) | 🔗 联动规则 (依赖与触发) | 🛡️ 校验限制 (Validation) |
| :-- | :-- | :-- | :-- | :-- |
| **iataCode** | IATA 三字码，机场业务识别核心。 | `air-port-admin`<br/>`AirPortAdmin/*` | **触发/依赖：** 下拉选中回显与选项首行均以 `三字码/英文名称` 组合展示。 | **必填**；前端 trim 后限 8 位并同步 `maxlength`；后端自动去首尾空格并**转大写**；未删除数据内不可重复（大小写不敏感）。 |
| **enName** | 机场英文名称。 | `air-port-admin` | **触发/依赖：** 与三字码组合成下拉 label。 | **必填**；后端去首尾空格、不转大小写；不可重复（大小写不敏感）。 |
| **cnName / icaoCode / city / remark** | 机场中文名称、ICAO 码、城市、备注。 | `air-port-admin` | **触发/依赖：** city 为纯文本，**不与国家联动**。 | 选填；备注最长 1024。编辑为全量提交，清空须显式传 `null`。 |
| **countryId** | 机场所属国家。 | `CountrySelect`<br/>`country-code-admin` | **触发/依赖：** 列表「国家名称」列取自关联对象 `country.countryName`；搜索区 `CountryId` 精确筛选，传值后未选国家的机场不会出现。 | **选填**（与港口资料不同，不做必填校验）；大数 ID 经 json-bigint 为 string，提交原样透传，禁止 `Number()`。 |
| **timeZone** | 相对 UTC 的小时偏移。 | `air-port-admin` | **触发/依赖：** 列表格式化为 `UTC+8`、`UTC+5.75` 展示。 | 选填；东正西负，支持小数（步进 0.25、精度 2 位）；**绝对值必须小于 100**，前端 min/max 限制为 ±99.99。 |
| **status** | 控制机场是否作为新业务的推荐选择项。 | `air-port-admin` | **触发/依赖：** 业务端下拉不按状态过滤，禁用项置灰。 | **必填**；只接受 `0 启用` / `1 禁用`，默认 0。 |
| **sortId** | 列表与下拉的排序权重。 | `air-port-admin` | **触发/依赖：** 后端固定按 `SortId DESC, Id DESC` 返回。 | **必填**，后端不会自动生成；整数，允许重复、允许 0 与负数，默认 0。 |

# 5. 核心业务卡点 (Business Blockers)

> [!IMPORTANT] **[卡点 1：编辑为全量提交]** `EditAsync` 会按传入值覆盖全部字段，选填字段传 `null` 即清空原值。表单必须把当前完整值一起提交；`modules/form.vue` 用 `toNullableText` / `toNullableNumber` / `toNullableId` 将空值显式转为 `null`，不能靠省略字段。

> [!IMPORTANT] **[卡点 2：排序由后端固定]** 列表接口不接受前端指定排序字段，固定 `SortId DESC, Id DESC`。因此 `data.ts` 中所有列显式设置 `sortable: false`，避免用户点击列头后表格与实际返回顺序不一致。

> [!IMPORTANT] **[卡点 3：没有全量机场接口]** 系统只提供分页接口，禁止「循环翻页拉全量再本地过滤」。`AirPortSelect` 一律把关键字交给后端，并通过滚动加载翻页；已选机场不在当前页时走 `AirPortAdmin/DetailAsync`（仅需登录）补全回显。

> [!IMPORTANT] **[卡点 4：country 可能为 null]** 机场允许不选国家，此时 `country` 返回 `null`。列表列与下拉第二行展示均须判空，禁止直接取 `country.countryName`。

> [!IMPORTANT] **[卡点 5：国家删除受本模块影响]** 国家被任意空运港口引用时禁止删除，`CountryCodeAdmin/DeleteAsync` 会返回 `该国家信息已被【空运港口】模块引用,禁止删除`（多引用方以「、」拼接）。

# 6. 变更与解析日志 (Changelog & Insights)

| 日期 | 变更类型 | 📝 业务功能变动 (针对工作流A) | 🤖 代码解析与架构洞察 (针对工作流B) |
| :-- | :-- | :-- | :-- |
| 2026-08-05 | `Feature` | 新增空运港口基础资料页面（列表 + 新增/编辑/删除），并提供 `AirPortSelect` 业务下拉供空运单据选机场。 | API 层单文件双命名空间：`AirPortApi` 承载业务端精简 DTO 与共享分页入参，`AirPortAdminApi` 承载管理端 DTO；下拉走 `AirPort/GetPagedListAsync`，回显兜底走 `AirPortAdmin/DetailAsync`。`countryId` 按大数 ID 规范以 `number \| string` 透传。 |
