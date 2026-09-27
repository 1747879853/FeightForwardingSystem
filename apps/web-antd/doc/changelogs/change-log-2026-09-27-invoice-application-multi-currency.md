# TAPD #1000181 / #1000182：开票申请多币别费用与发票开出配合

## 背景意图

开票申请需要支持一张申请挂多种费用币别，并录入「费用币别 → 申请主币别」汇率；发票开出按申请主币别合并，加挂时校验币别一致，被收费结算引用的发票不能冲红。

- [TAPD #1000181](https://www.tapd.cn/61580498/prong/stories/view/1161580498001000181) 开票申请：多币别费用与汇率录入
- [TAPD #1000182](https://www.tapd.cn/61580498/prong/stories/view/1161580498001000182) 发票开出：多币别展示、加挂币别校验、冲红结算拦截

## 核心逻辑变更

### 开票申请

- 申请 `currencyId` 为主币别；费用明细可为其他币别，`appliedAmount` 始终填费用原币。
- 非主币别必须录入汇率（>0，六位小数），入参字段 `invoiceApplicationExchangeRates`（新增 / 编辑 / 改主表 / 追加费用）。
- 申请总额 `totalAppliedAmount` = 各币别原币合计分别 × 汇率后四舍五入两位再相加（缺汇率为 `null`）。
- 选费用不再强制按主币别过滤；商品人民币参考 = `round(申请总额 × 发票汇率, 2)`。

### 发票开出

- 加挂申请须与发票开出 `currencyId` 一致；选单弹窗按开出币别过滤。
- 已提交申请列表 / 详情增加 `invoiceApplicationExchangeRates`；`totalAppliedAmount` / `appliedAmountRmb` 可为 `null`（缺汇率显示「-」并提示驳回补填）。
- `code=2`（含缺汇率）不提供「按汇率修正」；冲红若被收费结算引用，展示后端拦截文案。

## 避坑指南

- 不要再按「费用币别」拆成多张开票申请；一张申请可混币，靠汇率折到主币别。
- 发票开出本身不录汇率；折算用开票申请上的汇率行。
- `totalAppliedAmount === null` 勿当成 `0` 参与合计或商品金额回填。
- 冲红 / 反开票结算引用拦截以后端报错为准，前端无需预校验。

## 涉及文件（摘要）

- `src/utils/invoice-application-amount.ts`（折算工具）
- `src/api/Invoice/invoiceRequest.ts`、`invoice-application-admin.ts`、`InvoiceIssue.ts`
- `views/fee-management/invoice-application/**`
- `views/settlement-management/invoice-issue/**`
