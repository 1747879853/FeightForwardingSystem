# 多组织改造：company/companyId 前端全量迁移为 orgId/orgs

## 背景意图

后端完成「多组织 / 数据权限」改造（见接口变更说明 2026-07-22）：

1. 一个用户可隶属**多个组织机构**；
2. 数据权限单据把「归属公司 `companyId`」统一重命名为「归属组织 `orgId`」（可能是公司也可能是部门）；
3. 返回体不再返回单个 `company` / `companys` / `organizationUnits`，改为返回**组织串 `orgs`**（`OrganizationUnitSimpleDto[]`，从最高级组织到该组织依次排列）+ `orgId`；
4. 客户下线 `showCompanyId` / `showCompany`，统一用 `orgId` / `orgs`。

前端据此完成 DTO 与页面全量对接。**用户增删改（UserAdmin CRUD）不在本次范围**，但 `GetMy` 与 user store 已纳入（业务页需从「我的组织」派生录入项与开票公司信息）。

## 核心逻辑变更

### 1. 新增共享能力

- **`src/composables/use-my-org.ts`**：从 `userStore.userInfo.organizations`（GetMy 返回）派生工具函数：
  - `getMyOrgOptions()`：我的**直属组织**下拉选项（value=直属组织 id，即路径末端节点）。
  - `getMyDefaultOrgId()`：我的默认组织 id（`default=true`），用于表单默认值。
  - `getMyOrgPath(orgId)` / `getMyOrgCompanyNode(orgId)`：取组织完整路径 / 取该组织的**公司节点**（`isCompany`，含本位币、税号、开票地址、`orgBankAccounts`）。
- **`src/adapter/component/biz-select/my-org-select.vue`（新增 `MyOrgSelect`）**：归属组织录入下拉，选项即本人直属组织；挂载时若未选值自动填默认组织。已在 `biz-select/index.ts`、`adapter/component/index.ts`（含顶层 barrel 再导出与 `ComponentType`）注册。

### 2. API DTO 迁移（请求体 companyId→orgId；返回体 company/companys/organizationUnits→orgId+orgs）

涉及：`common/client`、`sea-export/{client-admin,sea-export-admin,order-fee-admin,payment-settlement-admin}`、`Invoice/{InvoiceIssue,invoiceRequest,invoiceRemarkTemplate}`、`settlement-management/{invoice-application-admin,bank-statement-admin,receive-settlement-admin,payment-application-admin}`、`audit-approval/payment-review-admin`、`core/user`。

- 各 DTO 统一新增 `OrganizationUnitSimpleDto { id; name?; localCurrencyId?; localCurrencycode? }`。
- 发票三单额外保留 `companyName`（组织名，便于直接展示），但**已删除 `companyId`**。
- `core/user.ts`：`GetMy` 结构由 `company` 单对象改为 `organizations: MyUserOrganizationPathDto[]`；`adaptUserInfo` 修复 `...safeMyInfo` 前后重复字面量键。

### 3. 页面迁移（录入 `MyOrgSelect` + 展示读 `orgs`）

- **客户**（`client/base`）：`showCompanyId`→`orgId`（可选），列表展示读 `orgs`。
- **海运出口 / 订单费用**（`sea-export-admin`、`orderFee`）：基础信息接入 `orgId`；本位币联动、打印上下文、`vxe-table` 本位币判断均从 `orgs` 内**公司节点**取。
- **付款申请 / 付款结算**（`fee-management/payment-application`、`settlement-management/payment-settlement`）：接入 `MyOrgSelect`；结算单 `orgId` 从来源单据/费用派生；公司银行账户按各申请 `orgs` 公司节点收集。
- **收款结算 / 银行流水**（`bank-statement` 及其核销面板/抽屉）：录入 `orgId`，抽屉向核销面板透传 `org-id`。
- **发票开出 / 开票申请 / 发票备注模板**：`companyId`→`orgId`，接入 `MyOrgSelect` 并只读展示「开票公司」；开票公司信息（税号/地址/银行）由 `getMyOrgCompanyNode(orgId)` 响应式派生；备注模板筛选/新增/编辑全量走 `orgId`，展示读 `orgs?.at(-1)?.name`。
- **工作台 / 个人中心**：展示由 `companys` / `company` 改读 `orgs` / `organizations`。

## 避坑指南

- **`orgId` 必填校验**：除「客户」「自动费用模板 OrderFeeTemplate」外，数据权限单据新增/修改必须传 `orgId`，否则后端报「所属组织不能为空」；且必须是本人**直属组织**（完全相等，不做父子判断）。`MyOrgSelect` 的选项已限定为直属组织，勿改用 `OrganizationSelect`（全量组织树）录入。
- **公司节点取值**：本位币 / 税号 / 公司银行账户等在 `orgs` 串首的**公司节点**（第一个 `isCompany` 或有 `localCurrencyId` 的节点），不要固定取 `orgs[0]` 或 `orgs.at(-1)`；展示「归属组织名」才用末端节点 `orgs?.at(-1)?.name`。
- **`MyOrgSelect` 必须在顶层 barrel 再导出**：`#/adapter/component` 的页面 `import { MyOrgSelect }` 依赖 `index.ts` 底部 `export { ... } from './biz-select'`，仅在 `biz-select/index.ts` 导出不够。
- **备注模板 `orgId` 恒有值**：`InvoiceRemarkTemDetailDto.orgId` 收紧为 `number`（模板必填），避免列表/编辑处 `number|null` 与 `number` 不匹配。
- **模板表达式里的 `as`**：`@update:model-value="(v) => fn(v as number)"` 是合法的（Vue SFC 编译启用了 TS 表达式），eslint-plugin-vue 的 parsing-error 为误报；勿去掉 `as` 否则触发 `unknown` 不可赋值。
- **范围边界**：海运进口（SeaImport）因其「代收付部门」特有逻辑**本次不动**；对账单（Statement）前端无 org 展示字段暂未改 UI；用户 CRUD 不在范围。
