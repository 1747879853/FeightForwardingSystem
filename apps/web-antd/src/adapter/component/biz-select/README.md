# biz-select 组件说明

本目录提供业务相关的选择器组件，主要基于 `ApiComponent` / `usePagedSelect`（部分场景直接使用 `Select`）封装，用于表单中的远程搜索与下拉选择。

## 组件用途一览

| 组件 | 用途 | 数据来源 |
| --- | --- | --- |
| `AirPortSelect` | 空运港口（机场）选择 | `#/api/system/base-data/air-port-admin`（`AirPort/GetPagedListAsync`，非 Admin） |
| `AreaCascader` | 行政区划级联选择（省/市/区） | `#/api/common/area` |
| `AreaLeafCascader` | 行政区划级联选择（省/市/区），对外只存最后一级 `areaId` | `#/api/common/area` |
| `CarrierSelect` | 承运人选择 | `#/api/system/base-data/carrier-admin` |
| `ClientSelect` | 客户选择 | `#/api/common/client`（`Client/GetPagedListAsync`，非 Admin） |
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
| `LaneSelect` | 航线编码选择 | `#/api/system/base-data/lane-code-admin` |
| `OrganizationSelect` | 组织/部门选择 | `#/api/system/organization-unit` |
| `MyOrgSelect` | 当前登录用户「我的组织」选择 | `#/composables/use-my-org`（源自 `UserAdmin/GetMyAsync`） |
| `UserOrgSelect` | 指定用户所属组织选择（如按所选销售取其组织） | `#/composables/use-all-user-org`（`UserAdmin/GetAllUserOrganizationsAsync`） |
| `PortSelect` | 港口编码选择 | `#/api/system/base-data/port-code-admin` |
| `RoleSelect` | 系统角色选择 | `#/api/system/role` |
| `UserSelect` | 系统用户选择（全量缓存 + 前端筛选） | `#/api/system/user-admin`（`User/GetUserSimplePagedListAsync`） |

## ClientSelect 扩展参数

`ClientSelect` 支持通过 `industryCategory` 过滤客户类型。该值会透传到通用接口参数 `industryCategory`（必填），用于限制下拉数据范围。编辑回显优先传 `selectedItems`（含 `id`/`name` 等简易字段）；通用接口无详情接口，不再调用 `ClientAdmin/DetailAsync`。

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

## AirPortSelect 扩展参数

`AirPortSelect` 走业务端接口 `AirPort/GetPagedListAsync`（仅需登录），**该接口不按状态过滤**，禁用的机场也会返回，组件将其置灰（`disabled`）而非隐藏。已选机场不在当前页时，按 id 走 `AirPortAdmin/DetailAsync` 补全回显。

| 参数 | 类型 | 默认 | 说明 |
| --- | --- | --- | --- |
| `countryId` | `number \| string` | — | 国家 id 精确筛选；传入后未选国家的机场不会出现 |
| `labelKey` | `string \| string[]` | `'iataEnName'` | 选中回显字段；`'iataEnName'` 为 `三字码/英文名称`，也可传字段名或点路径数组 |
| `pageSize` | `number` | `20` | 每页数量 |
| `selectedItems` | `AirPortSelectDto[]` | `[]` | 编辑回显用的已选机场对象 |

示例：

```vue
<AirPortSelect v-model="form.polId" :country-id="form.countryId" />
```

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

## UserOrgSelect 扩展参数

`UserOrgSelect` 用于「先选人、再选该人所属组织」的业务录入场景（如海运出口选定销售后选择归属组织 `orgId`）。数据走 `UserAdmin/GetAllUserOrganizationsAsync` 全量用户组织缓存（模块级共享、并发合并，首次加载后命中缓存）。

| 参数 | 类型 | 默认 | 说明 |
| --- | --- | --- | --- |
| `userId` | `number \| null` | — | 目标用户 id（如所选销售），据此取其所属组织范围 |
| `autoDefault` | `boolean` | `true` | `userId` 变化或挂载后，若未选值则自动填充该用户默认组织 |
| `clearOnUserChange` | `boolean` | `true` | 从「另一个用户」切换过来时清空已选值；首次赋值（新建选人/编辑回显）不清空 |
| `placeholder` | `string` | — | 占位提示 |

`v-model` 绑定值为「直属组织 id」（`orgId`）。

示例：

```vue
<UserSelect v-model="form.salesUserId" :user-attribute="16" />
<UserOrgSelect v-model="form.orgId" :user-id="form.salesUserId" />
```

如需在脚本中按 userId 直接取组织，可复用组合式 `useAllUserOrg`：`getUserOrgOptions(userId)`、`getUserDefaultOrgId(userId)`、`getUserOrgPath(userId, orgId)`、`getUserOrgCompanyNode(userId, orgId)`（后者含公司节点本位币与 `orgBankAccounts`）。

## UserSelect 扩展参数

`UserSelect` 默认走全量简易用户缓存（`createBizSelectCache` / `userSimpleListCache`）：`ensure()` 时有旧列表立刻用，同时后台静默拉 `GetUserSimplePagedListAsync`（`pageSize=1000` 翻页拼齐），成功才覆盖；失败保留旧缓存。无缓存时才等待首拉。搜索、`userAttribute`、`companyIds` 均在前端过滤，不再打分页接口。直绑 `Select`，避免 `ApiComponent` 刷新时清空 options 把已选人显示成 id。

| 参数 | 类型 | 默认 | 说明 |
| --- | --- | --- | --- |
| `userAttribute` | `number` | — | 角色位掩码；`UserSimpleDto.userAttribute` 未返回时不按角色筛 |
| `companyIds` | `Array<number \| string>` | — | 与 `UserSimpleDto.companyIds` 求交过滤候选；不传不过滤。已选人始终 pin 回显昵称 |
| `selectedItems` | `UserSimpleDto[]` | `[]` | 编辑/默认带回显 |
| `labelKey` | `string` | `'nickName'` | 展示字段 |

海出 / 海进 / 空出干系人传入 `companyIds`：未选归属组织时为当前登录用户各公司；选了组织后为该销售组织所属公司。客户默认干系人不因过滤被清空。

后续其它 biz-select 可复用 `createBizSelectCache({ name, fetchAll })`。登出时 `clearAllBizSelectCaches()` 清内存与 localStorage。

## 工具函数

- `usePagedSelect`：分页选择逻辑封装，提供远程搜索、滚动加载、选中项合并等通用能力。
- `useCachedSelect` / `createBizSelectCache`：全量列表缓存 + 前端筛选；`UserSelect` 已接入。

## usePagedSelect 已选项与搜索（2026-08-05）

- **关闭态回显：** `selectedItems` / pin 在无关键词时合并进 options，保证 label 可显示。
- **搜索态：** 有关键词时不把 pinned / selectedItems 注入候选列表；搜索结果命中已选 id 时用接口完整数据升级 pin。
- **完整性：** `mergeSelectedItems(items, { complete: true })` 标记详情/齐全数据；分页接口写入的 value 进入 `completeValues`，精简回显项不可覆盖。
- **防抖：** `searchDebounce` 默认 300ms（传 `0` 关闭）；输入框即时更新，实际请求延迟；下拉关闭与组件卸载会取消挂起定时器。

## usePagedSelect 搜索竞态防护（2026-05-17）

为避免“先请求旧关键词、后请求新关键词”时旧请求晚回包导致历史数据回灌，`usePagedSelect` 新增了查询版本控制机制：

- 每次搜索词变化（`handleSearch`）或扩展筛选参数变化（`extraParamsRef`）触发 `reset` 时，都会递增内部 `queryVersion`。
- 每次 `api` 请求发起时记录当前版本，响应返回后先校验版本一致性。
- 若版本不一致，说明该响应属于过期请求，会被直接丢弃，不会合并到当前下拉缓存。

### 生效范围

凡是通过 `usePagedSelect` 封装的选择器，均自动具备该防护能力，包括但不限于：

- `CtnSelect`
- `ClientSelect`
- `CarrierSelect`
- `CurrencySelect`
- `FeeCodeSelect`
- `PortSelect`
- `AirPortSelect`
- `CountrySelect`
- `LaneSelect`
- `ExchangeRateSelect`
- `RoleSelect`
- `CodeFrtSelect`
- `CodeGoodsSelect`
- `CodeInvoiceSelect`
- `CodeIssueTypeSelect`
- `CodePackageSelect`
- `CodeServiceSelect`
- `CodeSourceSelect`
