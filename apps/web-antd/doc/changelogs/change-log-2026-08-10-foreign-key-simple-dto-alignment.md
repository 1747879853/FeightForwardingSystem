# 外联平铺字段改读 SimpleDto — 前端对接

## 背景意图

后端将返回 DTO 中外联/字典的平铺 `*Name` / `*Code` 改为对应 SimpleDto 对象。前端需同步契约类型与视图层取值，避免列表/详情回显空白或运行时报错。

**不改范围**：用户 nickname（`creatorUserName` 等）、打印用 `StatementCurrencyFeeCodeDto`、外部 API / AI DTO（如云当、Gemini）。

## 核心逻辑变更

### 1. API 契约（`apps/web-antd/src/api/**`）

| 模块 | 主要改动 |
| :-- | :-- |
| TransportOrder / 海出/海进/空出 | `codePackage` / `codeSource` / `codeFrt` / `codeService` / 箱型 `ctnCode` / 品名 `codeGoods` 对象化；海出港口平铺 Name/Edi 删除，只读 `pol`/`pod` 等 Port 对象 |
| 分单 / 派车 | 往来单位、签单方式、港口、箱型子表改对象 |
| 付费申请 / 付费审核 | 港口区改对象；明细费用名改读 `orderFee.*`；任务列表 `settlement`/`currency` 对象 |
| 开票申请 / 开票 | `settlement` / `currency` / `company` / `codeInvoice` 对象 |
| 付费结算 / 银行流水 / 收费结算 / 对账 | `currency` / `originalCurrency` / `orgBankAccount` / `localCurrency` 等对象 |
| 主数据 | 港口 `country`/`lane`；汇率 `currency`；服务配置要求费用 `feeCode`；账期组织 `organizationUnit`；客户银行 `currency` |
| PreOrder / OrderFee | 去掉冗余 Name；本位币改 `localCurrency` |

### 2. 视图层取值规则

| 旧读法 | 新读法 |
| :-- | :-- |
| `clientName` | `client?.name` |
| `currencyCode` | `currency?.code` |
| `feeCodeName` | `feeCode?.cnName`（付费申请明细：`orderFee.feeCode.cnName`） |
| `codePackageName` | `codePackage?.name` |
| `ctnCodeName` | `ctnCode?.ctnName` |
| `polName` / `podName` | `pol?.portName \|\| pol?.cnName` |
| `codeIssueTypeName` | `codeIssueType?.billType` |
| `companyName` | `company?.name` |
| `orgBankAccountName` | `orgBankAccount?.bankName` 等 |
| `localCurrencyCode` | `localCurrency?.code` |

编辑表单内仍可把对象拍平为 `*Name` 供下拉 `selectedItems` 回显（如分单/派车装箱行、服务配置要求费用行）。

## 避坑指南

1. **CurrencySimpleDto 无 id**：外层保留 `currencyId`，展示读 `currency.code` / `cnName`。
2. **付费申请港口**：根上港口 Id/Name 已删，检索入参 `polId`/`podId` 不变；展示读对象。
3. **勿误改 nickname / 打印 FeeCode 平铺 / ExternalApi·AI DTO**。
4. **箱量汇总分组键**：用 `ctnCode?.ctnName`，不要再读 `ctnCodeName`。
5. 类型检查基线错误量较大；本次以「相对基线无新增 TS 错误」验收。
