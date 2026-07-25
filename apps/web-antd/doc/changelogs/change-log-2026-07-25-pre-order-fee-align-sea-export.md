# 2026-07-25 业务联系单费用逻辑对齐海运出口应收应付

## 背景意图

上一轮补齐了 `PreOrderFeeAddDto` 字段与费用代码联动后，对照海出 `orderFee` 逐项复核，仍有四处口径不一致：单位命名与海出/后端对不上、非箱型单位不带数量、本位币汇率未锁定、「票」数量与应付箱量处理偏弱。PRD 6.4 明确后端生成 `OrderFee` 时**按单位字符串重算数量与金额**，口径不一致会导致落库金额偏离。

## 核心逻辑变更

### 1. 单位口径统一

`GENERIC_UNITS` 由 `['票','重量','体积','TEU']` 改为 `['票','TEU','尺码','毛重','件数']`，与海出 `useDropdownSources.updateUnitList` 的 `fixedUnits` 一致；箱型名仍动态追加。

### 2. 新增 `fillQuantityByUnit`（对齐海出同名函数）

| 单位        | 数量来源                                                   |
| ----------- | ---------------------------------------------------------- |
| 票 / ORDER  | 固定 `1`（强制覆盖，不再 `?? 1`）                          |
| 毛重 / KGS  | `cargo.kgs`                                                |
| 尺码 / CBM  | `cargo.cbm`                                                |
| 件数 / PKGS | `cargo.pkgs`                                               |
| TEU         | 各箱型 `getCtnCodeDetail().teu × 箱量` 累加（带 Map 缓存） |
| 箱型名      | 箱量；**应收**另带卖价                                     |

单位切换、费用代码带出默认单位、新增行三处统一走此函数。

### 3. 本位币汇率锁定

`isLocalCurrencyRow` 比对行币别与归属组织 `localCurrencyId`：命中则 `exchangeRate = 1` 且汇率输入框禁用（Tooltip 提示"本位币汇率固定为 1"），不再请求汇率接口。归属组织变更时 `watch` 重刷所有行汇率。

编辑页 `watch(headerOrgId)` → `getOrganizationUnit(orgId)` 解析本位币传入。

### 4. 应付也带箱量

`applyCtnPriceAndQty` 中卖价仅应收写入，**箱量对收付都写**（对齐海出 `fillCtnQuantity` 不区分收付）；持续同步 `syncCtnDrivenRows` 仍只作用于应收，符合 PRD T11「应付单价不变」。

### 5. 编辑页新增上下文传递

- `feeCargo`：`bindCargoMetricsLinkage` 挂 `pkgs/kgs/cbm` 的 `onChange`，详情回填时一并同步
- `localCurrencyId`：由归属组织解析

## 避坑指南

1. **单位字符串是与后端的契约**：后端按「毛重/尺码/件数/票/TEU/箱型名」重算，前端下拉不可再自造「重量/体积」等别名。
2. **TEU 需要箱型详情**：`teu` 不在 `PreOrderCtnDto` 里，必须 `getCtnCodeDetail`；已加 `ctnTeuCache` 避免重复请求，箱型换了不会失效（按 `ctnCodeId` 缓存）。
3. **本位币判断依赖归属组织**：新建单未选归属组织时 `localCurrencyId` 为 `null`，此时所有币别都走汇率接口；选了组织后 `watch` 会回刷已有行。
4. **ID 比较统一 `String()`**：币别/箱型是雪花 ID，`currencyId` 声明为 `number` 但运行时可能是 string，比较与传参一律 `String()`（见 `bigint-id-precision` 规范）。
