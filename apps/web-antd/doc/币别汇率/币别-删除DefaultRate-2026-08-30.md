---
title: 币别删除 DefaultRate(默认对人民币汇率)
module: 币别
author: auto-doc-sync
last_updated: 2026-08-30
---

# 1. 背景意图 (Background)

`Currency.DefaultRate` 的注释是「默认对人民币汇率」——它是一个**硬编码到人民币**的汇率字段。

这个设计与本次汇率改造的方向直接冲突：汇率的本位币已经改成显式外键 `ExchangeRate.LocalCurrencyId`，由业务所属公司解析（见 [汇率-本位币改外键-2026-08-30.md](../汇率/汇率-本位币改外键-2026-08-30.md)）。币别表上再挂一个「对人民币」的汇率，等于在汇率表之外开了第二套口径，而且这套口径不分公司、不分时间区间、不分应收应付，跟汇率表随时会对不上。

本次直接删除该列。**币别就是币别，汇率一律去汇率表取。**

# 2. 核心逻辑变更 (Core Logic)

## 2.1 表结构

| 表              | 变更                                |
| :-------------- | :---------------------------------- |
| `App_Currencys` | 删除 `DefaultRate`(`decimal(10,6)`) |

## 2.2 接口变更

四个 DTO 全部去掉 `defaultRate`：

| DTO | 影响的接口 |
| :-- | :-- |
| `CurrencyAddDto` | `POST /api/services/app/CurrencyAdmin/AddAsync` 入参少一个字段 |
| `CurrencyEditDto` | `PUT /api/services/app/CurrencyAdmin/EditAsync` 入参少一个字段 |
| `CurrencyDto` | 币别列表与详情出参少一个字段 |
| **`CurrencySimpleDto`** | **全系统所有以对象形式返回币别的接口，出参都少一个字段** |

> [!IMPORTANT] **`CurrencySimpleDto` 是全局破坏性变更。**
>
> 它是全项目对象化返回币别时的通用类型，业务费用、客户对账、付费申请、付费结算、收费结算、开票申请、发票开出、报表、预配单等模块的返回体里都有它。前端只要有地方读了 `currency.defaultRate`，全部会拿到 `undefined`。

## 2.3 受影响的代码位置

| 文件 | 改了什么 |
| :-- | :-- |
| `Entites/Currency.cs` | 删列 |
| `App/Currency/Dto/CurrencyDto.cs` | 四个 DTO 删字段 |
| `App/Currency/CurrencyAdminAppService.cs` | `EditAsync` 删赋值 |
| `Caching/BasicDataCacheItem.cs` | 删 `DefaultRate` |
| `Caching/BasicDataCache.cs` | `GetCurrenciesAsync` 投影少一列 |
| `App/OrderFee/OrderFeeSimpleDtoMapper.cs` | 三个 `ToCurrency` 重载删赋值，按字段组装的那个重载**少一个参数** |
| `App/Statement/StatementAdminAppService.cs` | 币别投影、私有 `ToCurrencySimpleDto`(**少一个参数**)、6 处调用 |
| `App/Statement/StatementCurrencyFeeCodeFlatMapper.cs` | `Map` / `MapSummary` / `Build` 三个方法签名**各少一个参数** |
| `App/Statement/Dto/StatementDto.cs` | `StatementCurrencyFeeCodeDto.CurrencyDefaultRate` 删除 |
| `App/OrderFee/OrderFeeAdminAppService.cs`、`App/OrderFeeTemplate/…`、`App/PreOrder/…`、`App/PaymentApplication/…`、`App/PaymentSettlement/…`、`App/Report/…` | 各 1 处 `new CurrencySimpleDto` 删赋值 |

# 3. 避坑指南 (Pitfalls)

> [!IMPORTANT] **客户对账打印的 `currencyDefaultRate` 字段没了，要查一遍打印模板。**
>
> `StatementCurrencyFeeCodeDto` 是客户对账打印用的**全平铺** DTO，打印模板是配置化的、按字段名绑定。如果现网有模板绑了 `currencyDefaultRate`，删列之后那个位置会空掉或报错。上线前查一遍打印模板配置。

- **要汇率就去汇率表取，不要再找「币别上的汇率」。** 取数口径见汇率模块文档 2.2：`ResolveExchangeRateAsync(repo, currencyId, localCurrencyId, paySide, accountDate)`，本位币由业务所属公司解析。
- **`OrderFeeSimpleDtoMapper.ToCurrency(code, cnName, enName)` 少了第四个参数。** 原来第四个是 `decimal defaultRate = 0` 带默认值，所以只传三个参数的调用点不受影响；但如果有人写了四个参数的调用会编译不过。
- **`StatementCurrencyFeeCodeFlatMapper` 三个方法的参数是位置传参且类型相邻都是 `decimal`。** 删掉 `currencyDefaultRate` 之后，后面所有金额参数整体前移一位。这三个方法只有客户对账详情打印在调（2 处），已同步改完；以后要加参数务必对着调用点数一遍位置。

# 4. 变更日志 (Changelog)

| 日期 | 变更类型 | 📝 业务功能变动 | 🤖 代码解析与架构洞察 |
| :-- | :-- | :-- | :-- |
| 2026-08-30 | `Change` | 删除币别的「默认对人民币汇率」`DefaultRate`。新增/编辑入参、币别列表详情出参、以及**全系统所有返回 `CurrencySimpleDto` 的接口**都少一个 `defaultRate` 字段；客户对账打印的平铺字段 `currencyDefaultRate` 一并删除。 | 删它的理由不是「没人用」而是「它是第二套汇率口径」：这一列写死对人民币，不分公司、不分有效期、不分应收应付，与本次改成显式外键的 `ExchangeRate.LocalCurrencyId` 天然会漂。改动本身机械但面很广，20 多处，其中三类要特别当心：①`CurrencySimpleDto` 是全项目通用币别对象，删字段等于所有返回币别的接口契约都变；②`StatementCurrencyFeeCodeFlatMapper` 的 `Map`/`MapSummary`/`Build` 三个签名里 `currencyDefaultRate` 夹在一串 `decimal` 中间，删掉后面的金额参数整体前移，纯靠位置传参，容易改错；③`StatementCurrencyFeeCodeDto.CurrencyDefaultRate` 是客户对账**打印模板**按字段名绑定的平铺字段，删列前必须查现网模板有没有在用，这是唯一一处代码上看不出来的影响。 |
