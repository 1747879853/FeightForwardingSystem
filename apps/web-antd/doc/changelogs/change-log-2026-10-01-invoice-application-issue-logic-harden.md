# 开票申请 / 发票开出逻辑加固

## 背景意图

排查发现选费重复创建、购方银行被默认覆盖、提交校验偏弱、默认商品编码字段不一致、备注模板传错结算对象等问题，按 Critical/High 落地修复。另修销售方「地址、电话」不回显。

## 核心逻辑变更

### 开票申请

- 选费创建：API 成功后再写本地费用；创建成功立即 `return`，避免与详情重载竞态；保存/提交以 `formData.id` 判定已落库，防止 `/add` 路由下重复 `AddAsync`。
- 提交闸门：费用非空（提交时）、商品非空且有编码、购销方银行、商品合计与费用折人民币差额 ≤0.01。
- `handleSubmitForAudit` 与 `handleDirectSubmit` 同路径（先保存再提交）。
- 备注模板弹窗 `settlement-id` 改为结算对象 id。
- 列表删除拦截待审核/已开票；费用 id 比较统一 `String()`；默认商品同时匹配 `currency.code` 与 `defaultCurrency`。

### 发票开出

- `loadClientInvoiceInfo`：已有银行 id 时按银行反查抬头并保留，不覆盖为默认银行。
- `fixedHeaderId`（实为银行 id）通过 `findClientInvoiceInfoByBankId` 解析抬头名称。
- 保存校验：`editLocked`、org、申请、商品、金额差异、缺汇率。
- `recalculateGoodsDetails` 注入 `applicationGroupsData`；无商品明细时中止创建/加挂。
- 选申请 id 比较统一 `String()`；默认商品字段统一。

### 销售方地址/电话

- `resolveMyOrgCompanyNode` 不再直接返回 `GetMy` 缓存节点（常缺 `invoiceAddress`/`invoiceTel`），统一按公司 id 调 `GetOrganizationUnitAsync`。
- 申请/开出 `applyCompanyNode`：开票地址电话为空时回退办公地址/联系电话。

## 涉及文件（摘要）

- `composables/use-my-org.ts`
- `views/_shared/invoice-goods/find-default-code-invoice.ts`（新增）
- `views/fee-management/invoice-application/**`
- `views/settlement-management/invoice-issue/**`
