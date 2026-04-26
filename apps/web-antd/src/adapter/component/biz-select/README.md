# biz-select 组件说明

本目录提供业务相关的选择器组件，主要基于 `ApiComponent` / `usePagedSelect`（部分场景直接使用 `Select`）封装，用于表单中的远程搜索与下拉选择。

## 组件用途一览

| 组件 | 用途 | 数据来源 |
| --- | --- | --- |
| `AreaCascader` | 行政区划级联选择（省/市/区） | `#/api/common/area` |
| `AreaLeafCascader` | 行政区划级联选择（省/市/区），对外只存最后一级 `areaId` | `#/api/common/area` |
| `CarrierSelect` | 承运人选择 | `#/api/system/base-data/carrier-admin` |
| `ClientSelect` | 客户选择 | `#/api/sea-export/client-admin` |
| `CodeFrtSelect` | 运费条款（FRT）编码选择 | `#/api/system/base-data/code-frt-admin` |
| `CodeGoodsSelect` | 货物类型编码选择 | `#/api/system/base-data/code-goods-admin` |
| `CodeInvoiceSelect` | 发票类型编码选择 | `#/api/system/base-data/code-invoice-admin` |
| `CodeIssueTypeSelect` | 问题类型编码选择 | `#/api/system/base-data/code-issue-type-admin` |
| `CodePackageSelect` | 包装类型编码选择 | `#/api/system/base-data/code-package-admin` |
| `CodeServiceSelect` | 服务类型编码选择 | `#/api/system/base-data/code-service-admin` |
| `CodeSourceSelect` | 来源类型编码选择 | `#/api/system/base-data/code-source-admin` |
| `CountrySelect` | 国家/地区选择 | `#/api/system/base-data/country-code-admin` |
| `CtnSelect` | 箱型编码选择 | `#/api/system/base-data/ctn-code-admin` |
| `CurrencySelect` | 币种选择 | `#/api/system/base-data/currency-admin` |
| `ExchangeRateSelect` | 汇率记录选择 | `#/api/system/base-data/exchange-rate-admin` |
| `FeeCodeSelect` | 费用代码选择 | `#/api/system/base-data/fee-code-admin` |
| `FeeNameSelect` | 费用名称选择 | `#/api/system/base-data/fee-name-admin` |
| `LaneSelect` | 航线编码选择 | `#/api/system/base-data/lane-code-admin` |
| `OrganizationSelect` | 组织/部门选择 | `#/api/system/organization-unit` |
| `PortSelect` | 港口编码选择 | `#/api/system/base-data/port-code-admin` |
| `RoleSelect` | 系统角色选择 | `#/api/system/role` |
| `UserSelect` | 系统用户选择 | `#/api/system/user-admin` |

## ClientSelect 扩展参数

`ClientSelect` 支持通过 `industryCategory` 过滤客户类型。该值会被透传到接口参数 `IndustryCategory`，用于限制下拉数据范围。

示例：

```vue
<ClientSelect industry-category="a" />
```

其中 `industryCategory` 的可选值可参考 `src/views/client/data.ts` 中 `getIndustryCategoryOptions`：

| 值  | 含义       |
| --- | ---------- |
| `a` | 船公司     |
| `b` | 发货人     |
| `c` | 场站       |
| `d` | 航空公司   |
| `e` | 收货人     |
| `f` | 报关行     |
| `g` | 快递公司   |
| `h` | 通知方     |
| `i` | 车队       |
| `j` | 贸易商     |
| `k` | 代理       |
| `l` | 其他       |
| `m` | 供应商     |
| `n` | 船代       |
| `o` | 订舱代理   |
| `p` | 委托单位   |
| `q` | 仓库       |
| `r` | 保险公司   |
| `s` | 目的港代理 |
| `u` | 工厂       |

## AreaLeafCascader（推荐用于只存末级 areaId 场景）

`AreaLeafCascader` 内部使用 `AreaCascader`，但对外 `v-model` 为**最后一级地区 code**（`string`）。  
适合后端仅存 `areaId` 的业务：新增/编辑提交直接传 `areaId`，详情回显时组件会自动调用 `GetAreaAndParents` 还原路径。

示例：

```vue
<AreaLeafCascader
  v-model="formData.areaId"
  :placeholder="$t('ui.placeholder.select')"
/>
```

如果你需要完整路径数组（如 `['省code', '市code', '区code']`），请继续使用 `AreaCascader`。

## OrganizationSelect 扩展参数

`OrganizationSelect` 支持通过 `isCompany` 过滤组织类型。该值会透传到接口参数 `IsCompany`：

- `true`：仅公司
- `false`：仅部门
- `undefined`（不传）：全部组织

示例：

```vue
<OrganizationSelect :is-company="true" />
```

## 工具函数

- `usePagedSelect`：分页选择逻辑封装，提供远程搜索、滚动加载、选中项合并等通用能力。
