# 外联平铺改 SimpleDto — 前端对接文档（2026-08-10）

## 1. 说明

本次将返回 DTO 中外联/字典的平铺 `*Name` / `*Code` 改为对应 SimpleDto 对象。  
**一般保留实体 FK `*Id`**（付费申请港口区曾删除根上港口 Id，改读对象内 `id`）。  
**不改**：用户 nickname（`creatorUserName` 等）、打印用 `StatementCurrencyFeeCodeDto`、外部 API / AI DTO。

---

## 2. SimpleDto 读字段速查

| 类型 | 常用展示字段 |
| :-- | :-- |
| `ClientSimpleDto` / `ClientSimpleDtoForOrder` | `id` / `name` / `fullName` / `code` |
| `CurrencySimpleDto` | `code` / `cnName` / `enName` / `defaultRate`（**无 id**，外层保留 `currencyId`） |
| `FeeCodeSimpleDto` | `id` / `code` / `cnName` / `enName` |
| `PortCodeSimpleDto` | `id` / `portName` / `cnName` / `ediCode` / `lane` / `country`（结构见《港口模块总逻辑文档》4.1） |
| `PortCodeSimpleDtoForOrder` | 与 `PortCodeSimpleDto` 字段完全一致，两个类名按同一套逻辑取值 |
| `CountryCodeSimpleDto` | `id` / `code` / `countryName` / `countryEnName` |
| `LaneCodeSimpleDto` | `id` / `code` / `laneName` / `laneEnName` / `ediCode` |
| `CodePackageSimpleDto` | `id` / `name` / `ediCode` |
| `CodeSourceSimpleDto` | `id` / `code` / `cnName` / `enName` |
| `CodeFrtSimpleDto` | `id` / `cnName` / `enName` |
| `CodeServiceSimpleDto` | `id` / `cnName` / `enName` / `ediCode` |
| `CtnCodeSimpleDto` | `id` / `ctnName` / `ctnSize` / `ctnType` / `teu` |
| `CodeGoodsSimpleDto` | `id` / `code` / `name` / `enName` / `hsCode` |
| `CodeIssueTypeSimpleDto` | `id` / `billType` / `enName` |
| `CodeInvoiceSimpleDto` | 按模块已有字段 |
| `CarrierSimpleDto` | `id` / `code` / `cnName` / `cnShortName` / `enName` |
| `CompanySimpleDto` / `OrganizationUnitSimpleDto` | `id` / `name` 等 |
| `OrgBankAccountSimpleDto` / `ClientInvoiceBankSimpleDto` | 按银行对象字段 |
| `WarehouseSimpleDto` | `id` / `name` / `type` |
| `PackingUnitSimpleDto` | `id` / `name` |
| `FeeNameSimpleDto` | `id` / `code` / `name` / `enName` |
| `AgreementSimpleDto` | `id` / `code` |

---

## 3. 按接口：变动字段对照

### 3.1 付费申请

#### `GET /api/services/app/PaymentApplicationAdmin/GetOrderFeeGroupAsync`

返回：`PagedList<PayAppFeeGroupDto>`（继承 `TransportOrderDto`）

**A. 港口区（根上港口 Id/Name 删除，改为对象；备注保留）**

| 删除字段 | 改为 |
| :-- | :-- |
| `prepareAtId` / `prepareAtName` | `prepareAt`（`PortCodeSimpleDtoForOrder`） |
| `signingPortId` / `signingPortName` | `signingPort` |
| `podId` / `podName` | `pod` |
| `countryName` / `countryEnName` | `pod.country.countryName` / `pod.country.countryEnName` |
| `laneName` | `pod.lane.laneName` |
| `polId` / `polName` | `pol` |
| `pot1Id` / `pot1Name` | `pot1` |
| `pot2Id` / `pot2Name` | `pot2` |
| `receivePortId` / `receivePortName` | `receivePort` |
| `deliverPortId` / `deliverPortName` | `deliverPort` |

保留：`podRemark` / `polRemark` / `pot1Remark` / `pot2Remark` / `receivePortRemark` / `deliverPortRemark`  
入参检索 `polId`/`podId` 不变。

**B. 业务字典 / 箱型 / 品名（随 TransportOrderDto）**

| 删除字段 | 改为 |
| :-- | :-- |
| `codePackageName` | `codePackage.name` |
| `codeSourceName` | `codeSource.cnName` |
| `codeFrtName` | `codeFrt.cnName` |
| `codeServiceName` | `codeService.cnName` |
| `orderCtns[].ctnCodeName` | `orderCtns[].ctnCode.ctnName` |
| `orderCtns[].codePackageName` | `orderCtns[].codePackage.name` |
| `orderCtns[].codeGoodsName` / `codeGoodsHSCode` | `orderCtns[].codeGoods.name` / `codeGoods.hsCode` |
| `orderCodeGoodss[].codeGoodsName` / `codeGoodsHSCode` | `orderCodeGoodss[].codeGoods.name` / `hsCode` |

#### `GET /api/services/app/PaymentApplicationAdmin/DetailAsync`

| 删除字段（明细项）                      | 改为                         |
| :-------------------------------------- | :--------------------------- |
| `paymentApplicationItems[].feeCodeName` | `….orderFee.feeCode.cnName`  |
| `….feeCurrencyName`                     | `….orderFee.currency.cnName` |
| `….feeSettlementName`                   | `….orderFee.settlement.name` |

保留：`feeAmount`、`orderFee`。

结算币别组（若返回）：`originalCurrencyCode` → `originalCurrency.code`（保留 `originalCurrencyId`）。

#### `GET /api/services/app/PaymentApplicationAdmin/PayAppTaskListAsync`

| 删除字段 | 改为 |
| :-- | :-- |
| `settlementName` | `settlement`（`ClientSimpleDtoForOrder`）→ `settlement.name` |
| `currencyCode` | `currency`（`CurrencySimpleDto`）→ `currency.code`（保留 `currencyId`） |
| `settlementReceivableGroup[].currencyCode` | `settlementReceivableGroup[].currency.code`（保留组内 `currencyId`） |

---

### 3.2 业务单 / 海出 / 海进 / 空出 / 对账选费 / 服务任务（共用 TransportOrder 字典）

凡返回 `TransportOrderDto` / 内嵌 `transportOrder` 的列表、详情，字典字段同 **3.1-B**。

| 接口 |
| :-- |
| `GET /api/services/app/TransportOrderAdmin/GetPagedListAsync`（及费用锁定列表等） |
| `GET /api/services/app/SeaExportAdmin/GetPagedListAsync`、`DetailAsync` |
| `GET /api/services/app/SeaImportAdmin/GetPagedListAsync`、`DetailAsync` |
| `GET /api/services/app/AirExportAdmin/GetPagedListAsync`、`DetailAsync` |
| `GET /api/services/app/StatementAdmin/GetOrderFeeGroupAsync` |
| `GET /api/services/app/SeServiceTaskAdmin/GetWorkbenchAsync` 等 |

另：`UpperPKGS` 拼接包装名改为读 `codePackage?.name`；箱量汇总分组键改为 `ctnCode?.ctnName`。

---

### 3.3 海运出口 / 分单 / 派车（模块专有字段）

#### `GET .../SeaExportAdmin/GetPagedListAsync`、`DetailAsync`

| 删除                | 改为                                                 |
| :------------------ | :--------------------------------------------------- |
| `codeIssueTypeName` | `codeIssueType.billType`（`CodeIssueTypeSimpleDto`） |

#### `GET .../SeaExportSeparateAdmin/GetPagedListAsync`、`DetailAsync`

| 删除 | 改为 |
| :-- | :-- |
| `consigneeName` | `consignee.name` |
| `shipperName` | `shipper.name` |
| `notifierName` | `notifier.name` |
| `podAgentName` | `podAgent.name` |
| `codeIssueTypeName` | `codeIssueType.billType` |
| `signingPortName` / `signingPortCountryEnName` | `signingPort`（`PortCodeSimpleDtoForOrder`）→ `….cnName` / `….country.countryEnName` |
| `prepareAtName` / `prepareAtCountryEnName` | `prepareAt` 同上 |
| 箱型子表 `ctnCodeName` 等 | 同 3.1-B 箱型对象 |

#### `GET .../SeaExportDispatchAdmin/GetPagedListAsync`、`DetailAsync`

| 删除           | 改为           |
| :------------- | :------------- |
| `teamName`     | `team.name`    |
| `yardName`     | `yard.name`    |
| `factoryName`  | `factory.name` |
| 箱型子表平铺名 | 同 3.1-B       |

---

### 3.4 财务其它模块

#### 开票申请 `InvoiceApplicationAdmin` 列表 / 详情

| 删除                     | 改为                                 |
| :----------------------- | :----------------------------------- |
| `settlementName`         | `settlement.name`                    |
| `currencyCode`           | `currency.code`（保留 `currencyId`） |
| `companyName`            | `company.name`（`CompanySimpleDto`） |
| 货明细 `codeInvoiceName` | `codeInvoice` 对象字段               |

#### 开票 `InvoiceIssueAdmin` 列表 / 详情 / 申请嵌套

| 删除 | 改为 |
| :-- | :-- |
| `settlementName` / `currencyCode` / `companyName` | `settlement` / `currency` / `company` |

#### 付费结算 `PaymentSettlementAdmin` 列表 / 详情 / 按币别等

| 删除                   | 改为                    |
| :--------------------- | :---------------------- |
| `currencyCode`         | `currency.code`         |
| `originalCurrencyCode` | `originalCurrency.code` |

#### 银行流水 `BankStatementAdmin`（及 App）列表 / 详情

| 删除                    | 改为                     |
| :---------------------- | :----------------------- |
| `currencyCode`          | `currency.code`          |
| `orgBankAccountName`    | `orgBankAccount` 对象    |
| `clientInvoiceBankName` | `clientInvoiceBank` 对象 |

#### 收费结算 `ReceiveSettlementAdmin`

| 删除             | 改为              |
| :--------------- | :---------------- |
| `feeCodeName`    | `feeCode.cnName`  |
| `currencyCode`   | `currency.code`   |
| `settlementName` | `settlement.name` |

#### 对账 `StatementAdmin` 主 DTO（非打印 FeeCode 平铺）

| 删除                | 改为                 |
| :------------------ | :------------------- |
| `localCurrencyCode` | `localCurrency.code` |

`StatementCurrencyFeeCodeDto` **未改**，打印仍平铺。

#### 支票 `CheckBillAdmin`

| 删除             | 改为              |
| :--------------- | :---------------- |
| `settlementName` | `settlement.name` |

---

### 3.5 报价 / 港口主数据 / 配置 / 汇率 / 账期 / 银行 / 评论

| 接口 | 删除 | 改为 |
| :-- | :-- | :-- |
| `QuotationAdmin` 列表/详情 | `clientName` | `client.name` |
| 报价明细 | `polName`/`podName`/`pot1Name`/`pot2Name`/`clientName`/`laneName`/`*CountryEnName` | `pol`/`pod`/`pot1`/`pot2`/`client`/`lane`；国家 `*.country.countryEnName`，航线 `*.lane.laneName`（各港口对象内均可取到航线，明细根上的 `lane` 仍取自目的港） |
| `PortCodeAdmin` 详情/列表（主 DTO） | `countryName`/`countryEnName`/`laneName`/`laneCode` | `country` / `lane` 对象 |
| `SeServiceConfig` 要求费用 | `feeCodeName` | `feeCode.cnName` |
| `ExchangeRateAdmin` | `currencyCode` | `currency.code` |
| `ClientBillingPeriodAdmin` | `clientName`；子表组织名/来源名 | `client`；`organizationUnit` / `codeSource` |
| `ClientInvoiceInfo` / 客户银行 | `currencyCode` | `currency` |
| 评论列表输出 | `clientName` | `client`（含 `clientId`） |

---

### 3.6 仓配 / 协议

| 接口/DTO | 删除 | 改为 |
| :-- | :-- | :-- |
| `FeeRecord` 列表/打印 | `feeNameName`/`settlementName`/`packingUnitName`/`warehouseName` | `feeName`/`settlement`/`packingUnit`/`warehouse` |
| `EnterWarehouse` | `traderName`/`supplierName`/`warehouseName`/`warehouseAgreementCode`/`traderAgreementCode` | `trader`/`supplier`/`warehouse`/`warehouseAgreement`/`traderAgreement` |
| `Inventory` / `OuterWarehouse` / `OuterWarehouseDetail` | `packingUnitName`/`warehouseName`/`traderName`/`supplierName` | 对应对象 |
| `Agreement` 列表/详情及费用子表 | `settlementName` | `settlement` |
| 协议按单位费用 | `packingUnitName` | `packingUnit` |

---

### 3.7 业务费用 / 预报

| 接口/DTO | 删除 | 改为 |
| :-- | :-- | :-- |
| `PreOrder` | `clientName`/`carrierName`/`polName`/`podName`（已有对象并存） | 仅读 `client`/`carrier`/`pol`/`pod` |
| `OrderFee` | `localCurrencyCode` | `localCurrency`（及可用的 `localCurrencyId`） |
| OrderFee 修改前快照 | `feeCodeCode`/`settlementName`/`currencyCode` | `feeCode`/`settlement`/`currency` 对象 |
| `OrderFeeSimpleDto` | `currencyCode` | `currency` |

---

## 4. 未改范围（勿误改前端）

- `creatorUserName` / `lastModifierUserName` / `*UserNickName` / `applyUserName` 等 nickname
- `StatementCurrencyFeeCodeDto` 打印全平铺
- `ExternalApi/*`、`AI/Gemini`、TextIn 提取入参

---

## 5. 适配检查清单

- [ ] 付费申请选费：港口与国家/航线改读对象
- [ ] 付费申请详情明细：费用名改读 `orderFee.*`
- [ ] 付费申请任务列表：结算对象/币别对象
- [ ] 凡含 `transportOrder` 的页面：字典/箱型/品名
- [ ] 海出签单方式、分单港口与往来单位、派车车队
- [ ] 开票/付费结算/银行流水/收费结算/对账本位币
- [ ] 报价港口国家路径、港口主数据 Country/Lane
- [ ] 仓配贸易商/仓库/合同对象
- [ ] PreOrder 不再读冗余 Name；费用本位币对象
